#!/usr/bin/env node
/**
 * 浦东学区-小区关联导入
 * 直接解析保存的数据
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DATA_FILE = path.join(__dirname, '..', 'data', 'pudong_districts_full.json');

async function parseAndImport() {
  console.log('🏠 浦东学区-小区关联导入\n');
  
  // 读取已保存的完整数据
  let raw = '';
  if (fs.existsSync(DATA_FILE)) {
    raw = fs.readFileSync(DATA_FILE, 'utf-8');
    console.log('从文件加载数据...');
  } else {
    console.log('从stdin读取...');
    raw = fs.readFileSync('/dev/stdin', 'utf-8');
  }
  
  // 清理
  let text = raw.replace(/&nbsp;/g, ' ');
  text = text.replace(/<[^>]+>/g, '\n');
  text = text.replace(/\n+/g, '\n');
  
  // 分割并解析
  const segments = text.split('街道');
  const results = [];
  
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i].trim();
    const next = segments[i + 1].trim();
    
    // 找学校名
    const lines = seg.split('\n');
    let schoolName = '';
    for (let j = lines.length - 1; j >= 0; j--) {
      const l = lines[j].trim();
      if (l.includes('中学') || l.includes('小学')) {
        schoolName = l.replace(/[^\u4e00-\u9fa5A-Za-z0-9（）\(\)]/g, '').trim();
        break;
      }
    }
    
    if (!schoolName || schoolName.length < 5) continue;
    
    // 找小区
    const nextLines = next.split('\n');
    let community = '';
    for (const line of nextLines) {
      const l = line.trim();
      if (!l) continue;
      if (l.match(/花园|新城|公寓|小区|家园|苑|园|庭|府|城|居|港|滩|岛|湾|里|坊|厦|楼|栋|座/)) {
        community = l.replace(/[^\u4e00-\u9fa5A-Za-z0-9（）\(\)]/g, '').trim();
        break;
      }
    }
    
    if (community) {
      results.push({
        schoolName,
        community,
        type: schoolName.includes('小学') ? '小学' : '初中'
      });
    }
  }
  
  // 去重
  const seen = new Set();
  const unique = results.filter(r => {
    const key = `${r.schoolName}__${r.community}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  console.log(`解析到 ${unique.length} 条关联\n`);
  
  // 保存解析结果
  const parsedFile = path.join(__dirname, '..', 'data', 'pudong_districts_parsed.json');
  fs.writeFileSync(parsedFile, JSON.stringify(unique, null, 2));
  console.log(`已保存到 ${parsedFile}\n`);
  
  // 样例
  console.log('📋 样例:');
  unique.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.schoolName} → ${r.community}`);
  });
  
  // 导入数据库
  console.log('\n🗄️ 导入数据库...\n');
  
  let sc = 0, cc = 0, dc = 0;
  const genId = (p, n) => `${p}-${n}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-').substring(0, 40);
  
  for (const item of unique) {
    try {
      const sid = genId('pd', item.schoolName);
      let school = await prisma.school.findUnique({ where: { id: sid } });
      
      if (!school) {
        school = await prisma.school.create({
          data: {
            id: sid,
            name: item.schoolName,
            type: item.type,
            district: '浦东新区',
            cityId: 'Shanghai',
            source: 'pudong.gov.cn 2024'
          }
        });
        sc++;
      }
      
      const cid = genId('cm', item.community);
      let community = await prisma.community.findUnique({ where: { id: cid } });
      
      if (!community) {
        community = await prisma.community.create({
          data: {
            id: cid,
            name: item.community,
            district: '浦东新区',
            cityId: 'Shanghai',
            source: 'pudong.gov.cn 2024'
          }
        });
        cc++;
      }
      
      const did = `${sid}-${cid}`.substring(0, 50);
      await prisma.schoolDistrict.upsert({
        where: { id: did },
        update: { year: 2024 },
        create: {
          id: did,
          schoolId: school.id,
          communityId: community.id,
          year: 2024,
          admissionType: '地段对口'
        }
      });
      dc++;
      
      if (dc % 100 === 0) console.log(`  已处理 ${dc} 条...`);
      
    } catch (e) {
      // 忽略
    }
  }
  
  console.log(`\n✅ 完成!`);
  console.log(`  新增学校: ${sc}`);
  console.log(`  新增小区: ${cc}`);
  console.log(`  新增关联: ${dc}`);
  console.log(`\n📊 数据库总计:`);
  console.log(`  学校: ${await prisma.school.count()}`);
  console.log(`  小区: ${await prisma.community.count()}`);
  console.log(`  关联: ${await prisma.schoolDistrict.count()}`);
}

parseAndImport()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('❌', e);
    prisma.$disconnect();
    process.exit(1);
  });
