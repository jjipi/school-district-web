#!/usr/bin/env npx ts-node
/**
 * 浦东新区2024年学校数据导入 - 正则版
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

const DATA_FILE = path.join(__dirname, '..', 'data', 'pudong_schools_2024.json');

// 正则匹配完整学校名称
const SCHOOL_PATTERNS = [
  /上海市[^\s，,。；;、\n(（]+?(?:中学|小学|九年一贯制|完全中学)/g,
  /浦东新区[^\s，,。；;、\n(（]+?(?:中学|小学|九年一贯制)/g,
];

function extractSchools(text: string): { name: string; type: string }[] {
  const schools: { name: string; type: string }[] = [];
  const seen = new Set<string>();
  
  for (const pattern of SCHOOL_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let name = match[0].trim();
      
      // 清理
      name = name.replace(/[\s\n\r]+/g, '');
      name = name.replace(/^["'""']|["'""']$/g, '');
      
      // 验证长度
      if (name.length < 6 || name.length > 30) continue;
      
      // 避免重复
      if (seen.has(name)) continue;
      seen.add(name);
      
      // 判断类型
      const type = name.includes('小学') ? '小学' : '初中';
      
      schools.push({ name, type });
    }
  }
  
  return schools;
}

async function main() {
  console.log('🎓 浦东2024学校导入\n');
  
  let schools: { name: string; type: string; district: string; source: string }[] = [];
  
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (data.schools?.length > 0) {
      schools = data.schools;
      console.log('📂 缓存加载:', schools.length);
    }
  }
  
  if (schools.length === 0) {
    console.log('🌐 获取数据...\n');
    
    const urls = [
      { type: '初中', url: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325564.html' },
      { type: '小学', url: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325561.html' }
    ];
    
    for (const { type, url } of urls) {
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
        text = text.replace(/&[a-z]+;/gi, ' ');
        text = text.replace(/\s+/g, ' ');
        
        const found = extractSchools(text);
        console.log(`  ${type}: ${found.length} 所`);
        
        for (const s of found) {
          schools.push({
            ...s,
            district: '浦东新区',
            source: 'pudong.gov.cn 2024'
          });
        }
      } catch (e: any) {
        console.log(`  ⚠️ ${type}: ${e.message}`);
      }
    }
    
    // 去重
    const seen = new Set<string>();
    schools = schools.filter(s => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
    
    // 保存
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ schools }, null, 2));
  }
  
  // 统计
  const elementary = schools.filter(s => s.type === '小学').length;
  const junior = schools.filter(s => s.type === '初中').length;
  console.log(`\n📊 总计: ${schools.length} 所 (小学${elementary}, 初中${junior})`);
  
  // 导入
  console.log('\n🗄️ 导入数据库...');
  let imported = 0;
  
  for (const school of schools) {
    try {
      const id = `pd-${school.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-').substring(0, 40)}`;
      
      await prisma.school.upsert({
        where: { id },
        update: {
          name: school.name,
          type: school.type,
          district: school.district,
          source: school.source,
          updatedAt: new Date()
        },
        create: {
          id,
          name: school.name,
          type: school.type,
          district: school.district,
          source: school.source,
          cityId: 'Shanghai'
        }
      });
      imported++;
    } catch (e: any) {
      if (e.code !== 'P2002') {
        console.log(`  ⚠️ ${school.name}: ${e.message.substring(0, 50)}`);
      }
    }
  }
  
  const total = await prisma.school.count({ where: { district: '浦东新区' } });
  console.log(`\n✅ 完成! 导入 ${imported}, 数据库共 ${total} 所浦东学校`);
}

main()
  .then(() => { prisma.$disconnect(); process.exit(0); })
  .catch(e => { console.error('❌', e); prisma.$disconnect(); process.exit(1); });
