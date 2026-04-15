#!/usr/bin/env npx ts-node
/**
 * 浦东学区-小区关联导入 - 修复版
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

const CACHE_FILE = path.join(__dirname, '..', 'data', 'pudong_districts.json');

interface Mapping {
  schoolName: string;
  schoolType: '初中' | '小学';
  address: string;
  street: string;
  community: string;
}

function parseText(text: string, schoolType: '初中' | '小学'): Mapping[] {
  const results: Mapping[] = [];
  
  // 清理文本
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ');
  
  // 查找所有包含"街道"的片段
  const segments = text.split('街道');
  
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];
    
    // 从segment中提取学校名和地址
    // 学校名通常以"上海市"或"浦东新区"开头
    const schoolMatch = segment.match(/(上海市[^\s]{0,30}?(?:中学|小学)[^\s]*)/);
    if (!schoolMatch) continue;
    
    const schoolName = schoolMatch[1].replace(/[\s\n\r]+/g, '').trim();
    if (schoolName.length < 5) continue;
    
    // 地址是学校后面的部分（最后一个路/弄/街号之前的内容）
    const afterSchool = schoolMatch[0];
    const addrMatch = afterSchool.match(/[^\s]+$/);
    const address = addrMatch ? addrMatch[0] : '';
    
    // 从下一个segment提取小区（到第一个空格前）
    const communityMatch = nextSegment.match(/^[^，,。\s]+/);
    const community = communityMatch ? communityMatch[0] : '';
    
    // 验证小区是有效的小区名
    const validCommunity = community.match(/(?:花园|新城|公寓|小区|家园|苑|园|庭|府|城|居|港|滩|岛|湾|居|里|坊|厦|楼|栋|座|苑|居)/);
    
    if (schoolName && community && validCommunity) {
      results.push({
        schoolName,
        schoolType,
        address,
        street: segment.slice(-10).replace(/[^\\u4e00-\\u9fa5]/g, ''), // 取最后几个字作为街道名
        community
      });
    }
  }
  
  // 去重
  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${r.schoolName}__${r.community}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  console.log('🏠 浦东学区-小区关联导入 (修复版)');
  console.log('==================================\n');
  
  let results: Mapping[] = [];
  
  // 如果有缓存就直接用
  if (fs.existsSync(CACHE_FILE)) {
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    if (cached.results?.length > 0) {
      results = cached.results;
      console.log('📂 从缓存加载:', results.length, '条\n');
    }
  }
  
  if (results.length === 0) {
    console.log('🌐 获取数据...\n');
    
    const urls = {
      junior: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325560.html',
      elementary: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325561.html'
    };
    
    for (const [type, url] of Object.entries(urls)) {
      console.log(`📚 获取${type === 'junior' ? '初中' : '小学'}...`);
      try {
        const { stdout } = await execAsync(
          `curl -s "${url}" -H "User-Agent: Mozilla/5.0"`,
          { timeout: 60000, maxBuffer: 100 * 1024 * 1024 }
        );
        
        const schoolType = type === 'junior' ? '初中' : '小学';
        const parsed = parseText(stdout, schoolType);
        console.log(`   解析到 ${parsed.length} 条`);
        results.push(...parsed);
      } catch (e: any) {
        console.log(`   ⚠️ 错误: ${e.message}`);
      }
    }
    
    // 保存缓存
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ results }, null, 2));
    console.log('\n💾 已缓存\n');
  }
  
  console.log(`📊 总计: ${results.length} 条`);
  
  // 样例
  console.log('\n📋 样例 (前5):');
  results.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.schoolName}`);
    console.log(`     地址: ${r.address}`);
    console.log(`     街道: ${r.street}`);
    console.log(`     小区: ${r.community}`);
  });
  
  // 导入数据库
  console.log('\n🗄️ 导入数据库...\n');
  
  let schoolCount = 0;
  let communityCount = 0;
  let districtCount = 0;
  
  function genId(prefix: string, name: string): string {
    return `${prefix}-${name}`
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .substring(0, 40);
  }
  
  for (const item of results.slice(0, 100)) { // 测试只导入100条
    try {
      const schoolId = genId('pd', item.schoolName);
      let school = await prisma.school.findUnique({ where: { id: schoolId } });
      
      if (!school) {
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
      
      const communityId = genId('cm', item.community);
      let community = await prisma.community.findUnique({ where: { id: communityId } });
      
      if (!community) {
        community = await prisma.community.create({
          data: {
            id: communityId,
            name: item.community,
            district: item.street,
            source: 'pudong.gov.cn 2024',
            cityId: 'Shanghai'
          }
        });
        communityCount++;
      }
      
      const sdId = `${schoolId}-${communityId}`.substring(0, 50);
      await prisma.schoolDistrict.upsert({
        where: { id: sdId },
        update: { year: 2024 },
        create: {
          id: sdId,
          schoolId: school.id,
          communityId: community.id,
          admissionType: '地段对口',
          year: 2024
        }
      });
      districtCount++;
      
      if (districtCount <= 5) {
        console.log(`  ✅ ${item.schoolName} → ${item.community}`);
      }
      
    } catch (e: any) {
      // 忽略
    }
  }
  
  const totalSchools = await prisma.school.count();
  const totalCommunities = await prisma.community.count();
  const totalDistricts = await prisma.schoolDistrict.count();
  
  console.log(`\n📊 统计:`);
  console.log(`  学校: ${totalSchools} (新增 ${schoolCount})`);
  console.log(`  小区: ${totalCommunities} (新增 ${communityCount})`);
  console.log(`  学区关联: ${totalDistricts} (新增 ${districtCount})`);
}

main()
  .then(() => { prisma.$disconnect(); process.exit(0); })
  .catch(e => { console.error('❌', e); prisma.$disconnect(); process.exit(1); });
