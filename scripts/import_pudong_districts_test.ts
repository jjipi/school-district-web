#!/usr/bin/env npx ts-node
/**
 * 浦东学区-小区关联导入 - 测试版
 * 解析学校对口小区数据
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);
const prisma = new PrismaClient();

const DATA_FILE = path.join(__dirname, '..', 'data', 'pudong_districts_raw.json');

interface SchoolDistrictData {
  schoolName: string;
  schoolType: string;
  campus: string;
  district: string;       // 所属街镇
  community: string;      // 小区名称
  address: string;        // 地址
}

async function fetchAndParse(): Promise<SchoolDistrictData[]> {
  console.log('📥 获取浦东学区数据...\n');
  
  const results: SchoolDistrictData[] = [];
  
  // 测试：只获取初中页面的前200行
  const url = 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325564.html';
  console.log('获取:', url);
  
  try {
    const { stdout } = await execAsync(`curl -s "${url}" -H "User-Agent: Mozilla/5.0"`, {
      maxBuffer: 50 * 1024 * 1024
    });
    
    // 清理HTML
    let text = stdout.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<[^>]+>/g, '\n');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/\s+/g, ' ');
    
    // 解析学校名称和对口地段
    // 格式：学校名称 + 地址 + 街道 + 小区名称
    
    // 匹配模式：学校名称后面跟着地址、街道、小区
    const schoolPattern = /([^\n]{5,30}?(?:中学|小学))[^\n]*\n([^\n]{5,60}?路[^\n]*)\n([^\n]+街道)[^\n]*\n([^\n]+?[花园|新城|公寓|小区|家园|苑|园|庭|府|城|居]+[^\n,，]*)/g;
    
    let match;
    let count = 0;
    const maxCount = 50; // 测试只取50条
    
    while ((match = schoolPattern.exec(text)) !== null && count < maxCount) {
      const [, schoolName, address, district, community] = match;
      
      // 清理
      const cleanSchool = schoolName.trim().replace(/[\s\n\r]+/g, '');
      const cleanAddr = address.trim().replace(/[\s\n\r]+/g, '');
      const cleanDistrict = district.trim().replace(/[\s\n\r]+/g, '');
      const cleanCommunity = community.trim().replace(/[\s\n\r]+/g, '');
      
      // 跳过噪音
      if (cleanSchool.length < 5 || cleanCommunity.length < 2) continue;
      if (cleanSchool.includes('未在') || cleanSchool.includes('就读')) continue;
      
      // 判断类型
      const type = cleanSchool.includes('小学') ? '小学' : '初中';
      
      results.push({
        schoolName: cleanSchool,
        schoolType: type,
        campus: '',
        district: cleanDistrict,
        community: cleanCommunity,
        address: cleanAddr
      });
      
      count++;
    }
    
  } catch (e: any) {
    console.log('⚠️ 获取失败:', e.message);
  }
  
  return results;
}

// ============ 导入数据库 ============

function generateId(prefix: string, name: string): string {
  return `${prefix}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);
}

async function importToDb(data: SchoolDistrictData[]): Promise<{ schools: number; districts: number; communities: number }> {
  console.log('\n🗄️ 导入数据库...\n');
  
  let schoolCount = 0;
  let districtCount = 0;
  let communityCount = 0;
  
  for (const item of data) {
    try {
      // 1. 确保学校存在
      const schoolId = generateId('pd', item.schoolName);
      let school = await prisma.school.findUnique({ where: { id: schoolId } });
      
      if (!school) {
        // 创建学校
        school = await prisma.school.create({
          data: {
            id: schoolId,
            name: item.schoolName,
            type: item.schoolType,
            district: '浦东新区',
            address: item.address,
            source: 'pudong.gov.cn 2024',
            cityId: 'Shanghai'
          }
        });
        schoolCount++;
      }
      
      // 2. 确保小区存在
      const communityId = generateId('cm', item.community);
      let community = await prisma.community.findUnique({ where: { id: communityId } });
      
      if (!community) {
        community = await prisma.community.create({
          data: {
            id: communityId,
            name: item.community,
            district: item.district,
            address: item.address,
            source: 'pudong.gov.cn 2024',
            cityId: 'Shanghai'
          }
        });
        communityCount++;
      }
      
      // 3. 创建学区关联
      const sdId = `${schoolId}-${communityId}`.substring(0, 50);
      
      await prisma.schoolDistrict.upsert({
        where: { id: sdId },
        update: {
          admissionType: '地段对口',
          year: 2024
        },
        create: {
          id: sdId,
          schoolId: school.id,
          communityId: community.id,
          admissionType: '地段对口',
          year: 2024
        }
      });
      districtCount++;
      
      console.log(`  ✅ ${item.schoolName} → ${item.community}`);
      
    } catch (e: any) {
      console.log(`  ⚠️ ${item.schoolName}: ${e.message.substring(0, 60)}`);
    }
  }
  
  return { schools: schoolCount, districts: districtCount, communities: communityCount };
}

// ============ 主流程 ============

async function main() {
  console.log('🏠 浦东学区-小区关联导入 (测试版)');
  console.log('===================================\n');
  
  let data: SchoolDistrictData[] = [];
  
  if (fs.existsSync(DATA_FILE)) {
    const cached = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (cached.data?.length > 0) {
      data = cached.data;
      console.log('📂 从缓存加载:', data.length, '条\n');
    }
  }
  
  if (data.length === 0) {
    data = await fetchAndParse();
    
    // 保存缓存
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ data }, null, 2));
  }
  
  console.log(`📊 获取到 ${data.length} 条学区关联数据\n`);
  
  // 显示样例
  console.log('📋 样例数据:');
  data.slice(0, 5).forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.schoolName}`);
    console.log(`     街道: ${d.district}`);
    console.log(`     小区: ${d.community}`);
  });
  
  // 导入
  const result = await importToDb(data);
  
  // 统计
  const totalSchools = await prisma.school.count({ where: { district: '浦东新区' } });
  const totalCommunities = await prisma.community.count();
  const totalDistricts = await prisma.schoolDistrict.count();
  
  console.log(`\n📊 统计:`);
  console.log(`  学校: ${totalSchools} 所 (新增 ${result.schools})`);
  console.log(`  小区: ${totalCommunities} 个 (新增 ${result.communities})`);
  console.log(`  学区关联: ${totalDistricts} 条 (新增 ${result.districts})`);
}

main()
  .then(() => { prisma.$disconnect(); process.exit(0); })
  .catch(e => { console.error('❌', e); prisma.$disconnect(); process.exit(1); });
