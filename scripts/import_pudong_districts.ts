#!/usr/bin/env npx ts-node
/**
 * 浦东学区-小区关联导入
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

// 对口地段页面URL
const URLS = {
  junior: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325560.html',  // 初中
  elementary: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325561.html' // 小学
};

interface DistrictMapping {
  schoolName: string;
  schoolType: string;
  address: string;
  street: string;
  community: string;
}

function parsePage(text: string, schoolType: '初中' | '小学'): DistrictMapping[] {
  const results: DistrictMapping[] = [];
  
  // 匹配学校名称 (以"上海市"或"浦东新区"开头，包含"中学"或"小学")
  // 后面跟着地址、街道、小区
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentSchool = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 学校名称行
    if (line.match(/^[上下海浦东]+[^\s]{0,20}(?:中学|小学)/) || 
        line.match(/^[^\s]{5,30}?(?:中学|小学)[^\n]*/)) {
      currentSchool = line.replace(/[^\u4e00-\u9fa5A-Za-z0-9\(\)（）]+$/, '').trim();
      if (currentSchool.length > 5 && currentSchool.length < 50) {
        // 后续行处理
        let j = i + 1;
        while (j < lines.length && j < i + 5) {
          const addrLine = lines[j];
          
          // 地址行（包含"路"、"街"、"镇"等）
          if (addrLine.match(/[路街巷道]/)) {
            // 尝试找街道和小区
            const nextLine1 = lines[j + 1] || '';
            const nextLine2 = lines[j + 2] || '';
            
            let street = '';
            let community = '';
            
            // 街道行
            if (nextLine1.includes('街道')) {
              street = nextLine1.replace(/[^\u4e00-\u9fa5]/g, '').replace('街道', '').trim();
            }
            
            // 小区行
            if (nextLine2.includes('花园') || nextLine2.includes('新城') || 
                nextLine2.includes('公寓') || nextLine2.includes('小区') ||
                nextLine2.includes('家园') || nextLine2.includes('苑') ||
                nextLine2.includes('园') || nextLine2.includes('庭') ||
                nextLine2.includes('府') || nextLine2.includes('城') ||
                nextLine2.includes('居') || nextLine2.includes('港') ||
                nextLine2.includes('滩') || nextLine2.includes('岛')) {
              community = nextLine2.replace(/[^\u4e00-\u9fa5A-Za-z0-9\(\)（）]+$/, '').trim();
            }
            
            if (street && community) {
              results.push({
                schoolName: currentSchool,
                schoolType,
                address: addrLine.replace(/[^\u4e00-\u9fa5A-Za-z0-9\(\)（）]/g, '').trim(),
                street,
                community
              });
            }
            
            j = i + 4; // 跳过已处理的行
          } else {
            j++;
          }
        }
      }
    }
  }
  
  // 去重
  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${r.schoolName}-${r.community}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchAndParse(): Promise<DistrictMapping[]> {
  console.log('📥 获取浦东学区数据...\n');
  
  const allResults: DistrictMapping[] = [];
  
  for (const [type, url] of Object.entries(URLS)) {
    console.log(`📚 获取${type === 'junior' ? '初中' : '小学'}数据: ${url}`);
    
    try {
      const { stdout } = await execAsync(`curl -s "${url}" -H "User-Agent: Mozilla/5.0"`, {
        maxBuffer: 100 * 1024 * 1024
      });
      
      // 清理HTML
      let text = stdout.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      text = text.replace(/<[^>]+>/g, ' ');
      text = text.replace(/&nbsp;/g, ' ');
      text = text.replace(/&amp;/g, '&');
      text = text.replace(/\s+/g, ' ');
      
      const schoolType = type === 'junior' ? '初中' : '小学';
      const results = parsePage(text, schoolType);
      
      console.log(`   解析到 ${results.length} 条`);
      allResults.push(...results);
      
    } catch (e: any) {
      console.log(`   ⚠️ 获取失败: ${e.message}`);
    }
  }
  
  return allResults;
}

// ============ 导入 ============

function generateId(prefix: string, name: string): string {
  return `${prefix}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);
}

async function importToDb(data: DistrictMapping[]): Promise<{ schools: number; communities: number; districts: number }> {
  console.log('\n🗄️ 导入数据库...\n');
  
  let schoolCount = 0;
  let communityCount = 0;
  let districtCount = 0;
  
  for (const item of data) {
    try {
      // 1. 确保学校存在
      const schoolId = generateId('pd', item.schoolName);
      let school = await prisma.school.findUnique({ where: { id: schoolId } });
      
      if (!school) {
        school = await prisma.school.create({
          data: {
            id: schoolId,
            name: item.schoolName,
            type: item.schoolType,
            district: '浦东新区',
            address: item.address,
            source: 'pudong.gov.cn 2024 对口地段',
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
            district: item.street + '街道',
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
      
      if (districtCount <= 10) {
        console.log(`  ✅ ${item.schoolName} → ${item.community}`);
      }
      
    } catch (e: any) {
      // 忽略错误
    }
  }
  
  return { schools: schoolCount, communities: communityCount, districts: districtCount };
}

// ============ 主流程 ============

async function main() {
  console.log('🏠 浦东学区-小区关联导入');
  console.log('==========================\n');
  
  let data: DistrictMapping[] = [];
  
  if (fs.existsSync(DATA_FILE)) {
    const cached = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (cached.data?.length > 0) {
      data = cached.data;
      console.log('📂 从缓存加载:', data.length, '条\n');
    }
  }
  
  if (data.length === 0) {
    data = await fetchAndParse();
    
    // 保存
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ data }, null, 2));
    console.log(`💾 缓存已保存\n`);
  }
  
  console.log(`📊 总计: ${data.length} 条学区关联`);
  
  // 样例
  console.log('\n📋 样例:');
  data.slice(0, 5).forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.schoolName} (${d.schoolType})`);
    console.log(`     街道: ${d.street}`);
    console.log(`     小区: ${d.community}`);
  });
  
  // 导入
  const result = await importToDb(data);
  
  // 统计
  const totalSchools = await prisma.school.count();
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
