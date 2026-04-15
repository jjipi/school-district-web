#!/usr/bin/env npx ts-node
/**
 * 浦东新区学校数据导入脚本
 * 
 * 数据来源：上海市教委官网 (edu.sh.gov.cn)
 * URL: https://edu.sh.gov.cn/gqzszc_pdxq/20210430/d686562eaa02484184bb1142aa3053ea.html
 * 
 * 使用方法:
 *   npx ts-node scripts/import_pudong.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// ============ 数据源配置 ============
const DATA_URL = 'https://edu.sh.gov.cn/gqzszc_pdxq/20210430/d686562eaa02484184bb1142aa3053ea.html';
const DATA_FILE = path.join(__dirname, '..', 'data', 'pudong_schools_raw.json');

// ============ 类型定义 ============
interface SchoolRaw {
  name: string;
  type: string;      // 小学/初中
  nature: string;     // 公办/民办
  address: string;
  phone?: string;
  website?: string;
}

interface ParseResult {
  updatedAt: string;
  source: string;
  totalCount: number;
  schools: SchoolRaw[];
}

// ============ HTML 解析 ============

/**
 * 解析学校表格
 */
function parseSchoolTable(html: string): SchoolRaw[] {
  const schools: SchoolRaw[] = [];
  
  // 匹配表格行 - 格式为: 浦东新区\t小学\t公办\t学校名称\t地址\t电话\t网址
  // 使用正则提取表行数据
  const rows = html.split('\n').filter(line => {
    return line.includes('浦东新区') && (line.includes('小学') || line.includes('初中'));
  });
  
  for (const row of rows) {
    // 分割单元格 (可能是 tab 或多个空格)
    const cells = row.split(/[\t]+/).map(c => c.trim()).filter(c => c);
    
    if (cells.length >= 5) {
      const [district, section, nature, name, address, phone, website] = cells;
      
      // 跳过标题行
      if (name === '学校名称' || !name) continue;
      
      schools.push({
        name: name.replace(/^\d+\s*/, ''), // 去除前导序号
        type: section === '小学' ? '小学' : '初中',
        nature: nature || '公办',
        address: address || '',
        phone: phone || '',
        website: website || ''
      });
    }
  }
  
  return schools;
}

// ============ 数据导入 ============

/**
 * 生成学校ID
 */
function generateSchoolId(name: string, district: string): string {
  const base = `${district}-${name}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return base.substring(0, 50);
}

/**
 * 导入学校到数据库
 */
async function importSchools(schools: SchoolRaw[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (const school of schools) {
    try {
      const id = generateSchoolId(school.name, '浦东新区');
      
      await prisma.school.upsert({
        where: { id },
        update: {
          name: school.name,
          type: school.type,
          district: '浦东新区',
          address: school.address,
          source: DATA_URL,
          updatedAt: new Date()
        },
        create: {
          id,
          name: school.name,
          type: school.type,
          district: '浦东新区',
          address: school.address,
          source: DATA_URL,
          cityId: 'Shanghai'
        }
      });
      
      success++;
      
      if (success % 20 === 0) {
        console.log(`  📊 Progress: ${success}/${schools.length}`);
      }
      
    } catch (e: any) {
      console.log(`  ⚠️ Failed: ${school.name} - ${e.message}`);
      failed++;
    }
  }
  
  return { success, failed };
}

// ============ 主流程 ============

async function main() {
  console.log('🎓 浦东新区学校数据导入');
  console.log('======================\n');
  
  // 方式1: 从文件加载 (如果有缓存)
  let schools: SchoolRaw[] = [];
  
  if (fs.existsSync(DATA_FILE)) {
    console.log('📂 从缓存加载数据...');
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as ParseResult;
    schools = data.schools;
    console.log(`   加载了 ${schools.length} 条数据\n`);
  } else {
    // 方式2: 直接请求 (需要 curl 或类似工具)
    console.log('🌐 从网络获取数据...');
    console.log(`   URL: ${DATA_URL}\n`);
    
    // 这里我们用 child_process 执行 curl
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const cmd = `curl -s "${DATA_URL}" -H "User-Agent: Mozilla/5.0"`;
      const { stdout } = await execAsync(cmd);
      
      // 解析表格
      schools = parseSchoolTable(stdout);
      
      // 保存缓存
      const data: ParseResult = {
        updatedAt: new Date().toISOString(),
        source: DATA_URL,
        totalCount: schools.length,
        schools
      };
      
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      console.log(`💾 缓存已保存到: ${DATA_FILE}\n`);
      
    } catch (e: any) {
      console.error(`❌ 获取数据失败: ${e.message}`);
      console.log('\n请先运行 web_fetch 获取数据并保存');
      return;
    }
  }
  
  console.log(`📊 共 ${schools.length} 所学校\n`);
  
  // 导入数据库
  console.log('🗄️ 导入数据库...');
  const { success, failed } = await importSchools(schools);
  
  console.log(`\n✅ 完成! 成功: ${success}, 失败: ${failed}`);
  
  // 验证
  const totalInDb = await prisma.school.count({
    where: { district: '浦东新区' }
  });
  console.log(`📊 数据库中浦东学校总数: ${totalInDb}`);
}

main()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
