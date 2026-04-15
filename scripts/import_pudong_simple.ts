#!/usr/bin/env npx ts-node
/**
 * 浦东新区2024年学校数据导入脚本 - 简化版
 * 
 * 使用方法:
 *   npx ts-node scripts/import_pudong_simple.ts
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

// ============ 配置 ============
const DATA_FILE = path.join(__dirname, '..', 'data', 'pudong_schools_2024.json');

// ============ 解析函数 ============

/**
 * 从HTML中提取学校数据
 */
function parseSchools(html: string): { name: string; type: string; address: string }[] {
  const schools: { name: string; type: string; address: string }[] = [];
  
  // 移除script和style标签
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, '\n');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/[\r\n]+/g, '\n');
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentSchool: { name: string; type: string; address: string } | null = null;
  
  for (const line of lines) {
    // 学校名称匹配：上海市...中学/小学，浦东新区...中学/小学
    const schoolMatch = line.match(/^(上海市[^"\n,，、]+?[中小学])/);
    if (schoolMatch) {
      if (currentSchool && currentSchool.name) {
        schools.push(currentSchool);
      }
      const name = schoolMatch[1].trim();
      const type = name.includes('小学') ? '小学' : '初中';
      currentSchool = { name, type, address: '' };
      continue;
    }
    
    // 地址匹配 (路/街/镇/城)
    if (currentSchool && !currentSchool.address && 
        (line.includes('路') || line.includes('街') || line.includes('镇') || line.includes('城') || line.includes('区')) &&
        line.length > 5 && line.length < 100) {
      currentSchool.address = line;
    }
  }
  
  if (currentSchool && currentSchool.name) {
    schools.push(currentSchool);
  }
  
  // 去重
  const seen = new Set<string>();
  return schools.filter(s => {
    const key = s.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============ 获取数据 ============

async function fetchData(): Promise<any[]> {
  console.log('📥 获取浦东2024年学校数据...\n');
  
  const schools: any[] = [];
  
  const urls = [
    { type: '初中', url: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325564.html' },
    { type: '小学', url: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325560.html' }
  ];
  
  for (const { type, url } of urls) {
    console.log(`📚 获取${type}数据: ${url}`);
    try {
      const { stdout } = await execAsync(`curl -s "${url}" -H "User-Agent: Mozilla/5.0"`, {
        maxBuffer: 50 * 1024 * 1024
      });
      
      const parsed = parseSchools(stdout);
      console.log(`   解析到 ${parsed.length} 所${type}`);
      
      for (const school of parsed) {
        schools.push({
          ...school,
          district: '浦东新区',
          source: 'pudong.gov.cn 2024'
        });
      }
    } catch (e: any) {
      console.log(`   ⚠️ 获取失败: ${e.message}`);
    }
  }
  
  return schools;
}

// ============ 导入数据库 ============

function generateId(name: string, district: string): string {
  return `${district}-${name}`
    .toLowerCase()
    .replace(/[\s\（\）\(\)]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 50);
}

async function importToDb(schools: any[]): Promise<number> {
  console.log('\n🗄️ 导入数据库...');
  
  let count = 0;
  for (const school of schools) {
    try {
      const id = generateId(school.name, school.district);
      await prisma.school.upsert({
        where: { id },
        update: {
          name: school.name,
          type: school.type,
          district: school.district,
          address: school.address,
          source: school.source,
          updatedAt: new Date()
        },
        create: {
          id,
          name: school.name,
          type: school.type,
          district: school.district,
          address: school.address,
          source: school.source,
          cityId: 'Shanghai'
        }
      });
      count++;
    } catch (e: any) {
      if (e.code !== 'P2002') {
        console.log(`   ⚠️ ${school.name}: ${e.message}`);
      }
    }
  }
  
  return count;
}

// ============ 主流程 ============

async function main() {
  console.log('🎓 浦东新区2024年学校数据导入');
  console.log('================================\n');
  
  let schools: any[] = [];
  
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (data.schools && data.schools.length > 0) {
      console.log('📂 从缓存加载...');
      schools = data.schools;
    }
  }
  
  if (schools.length === 0) {
    schools = await fetchData();
    
    // 保存
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      updatedAt: new Date().toISOString(),
      schools
    }, null, 2));
  }
  
  console.log(`\n📊 总计: ${schools.length} 所学校`);
  
  const elementary = schools.filter(s => s.type === '小学').length;
  const junior = schools.filter(s => s.type === '初中').length;
  console.log(`   小学: ${elementary} 所`);
  console.log(`   初中: ${junior} 所`);
  
  const imported = await importToDb(schools);
  
  const totalInDb = await prisma.school.count({ where: { district: '浦东新区' } });
  
  console.log(`\n✅ 完成! 导入 ${imported} 所`);
  console.log(`📊 数据库中浦东学校: ${totalInDb} 所`);
}

main()
  .then(() => { prisma.$disconnect(); process.exit(0); })
  .catch(e => { console.error('❌', e); prisma.$disconnect(); process.exit(1); });
