#!/usr/bin/env npx ts-node
/**
 * 浦东学区-小区关联导入 - 简单正则版
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
  schoolType: string;
  address: string;
  street: string;
  community: string;
}

function parseText(text: string, schoolType: '初中' | '小学'): Mapping[] {
  const results: Mapping[] = [];
  
  // 清理
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ');
  
  // 精确匹配模式：学校名 + 地址 + 街道 + 小区
  // 例如: 上海市建平中学西校（大唐校区） 白杨路199弄 花木街道 大唐盛世花园一期
  const pattern = /([^\s]{5,40}?(?:中学|小学)[^\s]*?)([^\s]{3,50}?)([^\s]{2,15}街道)\s+([^\s]{2,20}?(?:花园|新城|公寓|小区|家园|苑|园|庭|府|城|居|港|滩|岛|湾|里|坊|厦|楼|栋|座)+[^\s]*)/g;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [, school, address, street, community] = match;
    
    results.push({
      schoolName: school.trim(),
      schoolType,
      address: address.trim(),
      street: street.replace('街道', '').trim(),
      community: community.trim()
    });
  }
  
  return results;
}

async function main() {
  console.log('🏠 浦东学区-小区关联导入\n');
  
  let results: Mapping[] = [];
  
  if (fs.existsSync(CACHE_FILE)) {
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    results = cached.results || [];
    console.log('📂 缓存:', results.length, '条\n');
  }
  
  if (results.length < 100) {
    console.log('🌐 获取数据...\n');
    const urls = {
      junior: ['https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325560.html', '初中'],
      elementary: ['https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325561.html', '小学']
    };
    
    for (const [type, [url, label]] of Object.entries(urls)) {
      console.log(`📚 ${label}...`);
      try {
        const { stdout } = await execAsync(
          `curl -s "${url}" -H "User-Agent: Mozilla/5.0"`,
          { timeout: 60000, maxBuffer: 100 * 1024 * 1024 }
        );
        
        const parsed = parseText(stdout, label as '初中' | '小学');
        console.log(`   ${parsed.length} 条`);
        results.push(...parsed);
      } catch (e: any) {
        console.log(`   ⚠️ ${e.message.substring(0, 50)}`);
      }
    }
    
    // 去重
    const seen = new Set<string>();
    results = results.filter(r => {
      const key = `${r.schoolName}__${r.community}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ results }, null, 2));
  }
  
  console.log(`\n📊 总计: ${results.length} 条`);
  
  // 样例
  console.log('\n📋 样例:');
  results.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.schoolName} → ${r.community} (${r.street})`);
  });
  
  // 导入前100条测试
  console.log('\n🗄️ 导入测试 (100条)...\n');
  
  let sc = 0, cc = 0, dc = 0;
  const genId = (p: string, n: string) => `${p}-${n}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-').substring(0, 40);
  
  for (const item of results.slice(0, 100)) {
    try {
      const sid = genId('pd', item.schoolName);
      let school = await prisma.school.findUnique({ where: { id: sid } });
      if (!school) {
        school = await prisma.school.create({
          data: { id: sid, name: item.schoolName, type: item.schoolType, district: '浦东新区', cityId: 'Shanghai', source: 'pudong 2024' }
        });
        sc++;
      }
      
      const cid = genId('cm', item.community);
      let community = await prisma.community.findUnique({ where: { id: cid } });
      if (!community) {
        community = await prisma.community.create({
          data: { id: cid, name: item.community, district: item.street + '街道', cityId: 'Shanghai', source: 'pudong 2024' }
        });
        cc++;
      }
      
      const did = `${sid}-${cid}`.substring(0, 50);
      await prisma.schoolDistrict.upsert({
        where: { id: did },
        update: { year: 2024 },
        create: { id: did, schoolId: sid, communityId: cid, year: 2024, admissionType: '地段对口' }
      });
      dc++;
      
      if (dc <= 5) console.log(`  ✅ ${item.schoolName} → ${item.community}`);
      
    } catch (e: any) {}
  }
  
  console.log(`\n📊 数据库: 学校 ${await prisma.school.count()}, 小区 ${await prisma.community.count()}, 关联 ${await prisma.schoolDistrict.count()}`);
  console.log(`   本次新增: 学校 ${sc}, 小区 ${cc}, 关联 ${dc}`);
}

main().then(() => { prisma.$disconnect(); process.exit(0); }).catch(e => { console.error('❌', e); prisma.$disconnect(); process.exit(1); });
