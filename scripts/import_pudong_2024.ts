#!/usr/bin/env npx ts-node
/**
 * 浦东新区2024年学校数据导入脚本
 * 
 * 数据来源：
 * - 初中：https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325564.html
 * - 小学：https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325560.html
 * 
 * 使用方法:
 *   npx ts-node scripts/import_pudong_2024.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// ============ 数据源配置 ============
const DATA_URLS = {
  junior: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325564.html',
  elementary: 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325560.html'
};

const DATA_FILE = path.join(__dirname, '..', 'data', 'pudong_schools_2024.json');

// ============ 类型定义 ============
interface SchoolInput {
  name: string;
  type: string;      // 小学/初中
  district: string;
  address?: string;
  code?: string;
  source?: string;
}

// ============ HTML 表格解析 ============

/**
 * 解析浦东教育局2024学校表格
 * 表格格式：学校代码 | 学校 | 校区 | 学校性质 | 班级总数 | 学生总数 | ...
 */
function parseTable(html: string, schoolType: '小学' | '初中'): SchoolInput[] {
  const schools: SchoolInput[] = [];
  
  // 匹配学校代码行 (8位数字)
  const codeRegex = /(31\d{7})\s*\n\s*(.+?)\s*\n\s*(.+?)\s*\n\s*(公办|民办)/g;
  
  let match;
  while ((match = codeRegex.exec(html)) !== null) {
    const [, code, name, campus, nature] = match;
    
    // 跳过无意义行
    if (!name || name.includes('暂无') || name.includes('招生')) continue;
    
    // 清理名称
    const cleanName = name.trim().replace(/[\u3000\s]+/g, '');
    const cleanCampus = campus.trim().replace(/[\u3000\s]+/g, '');
    const fullName = cleanCampus && cleanCampus !== cleanName 
      ? `${cleanName}(${cleanCampus})` 
      : cleanName;
    
    schools.push({
      code,
      name: fullName,
      type: schoolType,
      district: '浦东新区',
      source: 'pudong.gov.cn 2024'
    });
  }
  
  return schools;
}

// ============ 数据获取 ============

async function fetchAndSave() {
  console.log('📥 获取浦东2024年学校数据...\n');
  
  const allSchools: SchoolInput[] = [];
  
  // 获取初中数据
  console.log('📚 获取初中数据...');
  try {
    const cmd = `curl -s "${DATA_URLS.junior}" -H "User-Agent: Mozilla/5.0"`;
    const { stdout } = await execAsync(cmd);
    
    const juniorSchools = parseTable(stdout, '初中');
    console.log(`   初中: ${juniorSchools.length} 所`);
    allSchools.push(...juniorSchools);
  } catch (e: any) {
    console.log(`   ⚠️ 初中数据获取失败: ${e.message}`);
  }
  
  // 获取小学数据
  console.log('📚 获取小学数据...');
  try {
    const cmd = `curl -s "${DATA_URLS.elementary}" -H "User-Agent: Mozilla/5.0"`;
    const { stdout } = await execAsync(cmd);
    
    const elementarySchools = parseTable(stdout, '小学');
    console.log(`   小学: ${elementarySchools.length} 所`);
    allSchools.push(...elementarySchools);
  } catch (e: any) {
    console.log(`   ⚠️ 小学数据获取失败: ${e.message}`);
  }
  
  // 保存原始数据
  const data = {
    updatedAt: new Date().toISOString(),
    sources: DATA_URLS,
    totalCount: allSchools.length,
    schools: allSchools
  };
  
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log(`\n💾 原始数据已保存: ${DATA_FILE}`);
  
  return allSchools;
}

// ============ 数据导入 ============

function generateSchoolId(name: string, district: string): string {
  const base = `${district}-${name}`
    .toLowerCase()
    .replace(/[\s\（\）\(\)]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return base.substring(0, 50);
}

async function importSchools(schools: SchoolInput[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  console.log('\n🗄️ 开始导入数据库...\n');
  
  for (const school of schools) {
    try {
      const id = generateSchoolId(school.name, school.district);
      
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
      
      success++;
      
      if (success % 50 === 0) {
        console.log(`   进度: ${success}/${schools.length}`);
      }
      
    } catch (e: any) {
      // 忽略重复键错误
      if (e.code === 'P2002') {
        success++; // 认为是成功（已存在）
      } else {
        console.log(`   ⚠️ ${school.name}: ${e.message}`);
        failed++;
      }
    }
  }
  
  return { success, failed };
}

// ============ 主流程 ============

async function main() {
  console.log('🎓 浦东新区2024年学校数据导入');
  console.log('==============================\n');
  
  let schools: SchoolInput[] = [];
  
  // 尝试从缓存加载
  if (fs.existsSync(DATA_FILE)) {
    console.log('📂 从缓存加载...');
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    schools = data.schools;
    console.log(`   加载了 ${schools.length} 所学校\n`);
  } else {
    // 从网络获取
    schools = await fetchAndSave();
  }
  
  if (schools.length === 0) {
    console.log('❌ 没有数据，退出');
    return;
  }
  
  // 按类型统计
  const elementary = schools.filter(s => s.type === '小学').length;
  const junior = schools.filter(s => s.type === '初中').length;
  console.log(`📊 统计:`);
  console.log(`   小学: ${elementary} 所`);
  console.log(`   初中: ${junior} 所`);
  console.log(`   总计: ${schools.length} 所\n`);
  
  // 导入
  const { success, failed } = await importSchools(schools);
  
  // 验证
  const totalInDb = await prisma.school.count({
    where: { district: '浦东新区' }
  });
  
  console.log(`\n✅ 导入完成!`);
  console.log(`   成功: ${success}`);
  console.log(`   失败: ${failed}`);
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
