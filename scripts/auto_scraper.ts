#!/usr/bin/env npx ts-node
/**
 * 学校数据自动爬虫脚本
 * 
 * 用法:
 *   npx ts-node scripts/auto_scraper.ts --source pudong
 *   npx ts-node scripts/auto_scraper.ts --all
 *   npx ts-node scripts/auto_scraper.ts --discover "浦东新区 学校 名录"
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient, Prisma } from '@prisma/client';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// ============ 配置 ============
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const SOURCES_FILE = path.join(PROJECT_ROOT, 'data', 'sources.json');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

// ============ Types ============
interface SourceConfig {
  name: string;
  district: string;
  url: string;
  type: string;
  parser: string;
  description: string;
}

interface SourcesData {
  sources: SourceConfig[];
  parsers: Record<string, any>;
}

interface SchoolRaw {
  name: string;
  type?: string;        // 小学/初中
  level?: string;       // 区重点/市重点
  district: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  features?: string;
  source?: string;
}

interface ParsedSchool {
  name: string;
  url?: string;
  type?: string;
  level?: string;
  address?: string;
  features?: string;
}

// ============ Prisma Client ============
const prisma = new PrismaClient();

// ============ 工具函数 ============

/**
 * 执行 Tavily 搜索
 */
async function tavilySearch(query: string, maxResults = 5): Promise<any[]> {
  const scriptPath = path.join(process.env.HOME || '/root', '.openclaw/workspace-pp/skills/openclaw-tavily-search/scripts/tavily_search.py');
  
  try {
    const cmd = `python3 "${scriptPath}" --query "${query}" --max-results ${maxResults} --format raw`;
    const { stdout } = await execAsync(cmd, { timeout: 30000 });
    const result = JSON.parse(stdout);
    return result.results || [];
  } catch (e: any) {
    throw new Error(`Tavily search failed: ${e.message}`);
  }
}

/**
 * 获取网页内容
 */
async function fetchPage(url: string): Promise<string> {
  try {
    const cmd = `curl -s -L "${url}" -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" --max-time 30`;
    const { stdout } = await execAsync(cmd, { timeout: 35000 });
    return stdout;
  } catch (e: any) {
    throw new Error(`Failed to fetch ${url}: ${e.message}`);
  }
}

/**
 * 简单的 HTML 解析 - 提取链接
 */
function extractLinks(html: string, selector: string): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = [];
  
  // 匹配 <a href="..." ...>text</a>
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].trim();
    
    // 过滤非学校链接
    if (href && text && (href.includes('school') || href.includes('xx') || href.includes('cz') || href.includes('zs'))) {
      links.push({ href, text });
    }
  }
  
  return links;
}

/**
 * 解析学校详情页
 */
function parseSchoolDetail(html: string, url: string): Partial<ParsedSchool> {
  const result: Partial<ParsedSchool> = {};
  
  // 简单文本提取 - 实际生产需要更复杂的 HTML 解析
  // 提取标题
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    result.name = titleMatch[1].trim();
  }
  
  // 提取地址
  const addrMatch = html.match(/地址[：:]\s*([^<\n]+)/i) || html.match(/address[^>]*>([^<]+)/i);
  if (addrMatch) {
    result.address = addrMatch[1].trim();
  }
  
  // 提取学校类型
  const typeMatch = html.match(/(小学|初中|中学|九年一贯制|完全中学)/);
  if (typeMatch) {
    result.type = typeMatch[1];
  }
  
  // 提取特色
  const featMatch = html.match(/特色[：:]\s*([^<\n]+)/i);
  if (featMatch) {
    result.features = featMatch[1].trim();
  }
  
  return result;
}

/**
 * 加载数据源配置
 */
function loadSources(): SourcesData {
  if (!fs.existsSync(SOURCES_FILE)) {
    throw new Error(`Sources file not found: ${SOURCES_FILE}`);
  }
  const content = fs.readFileSync(SOURCES_FILE, 'utf-8');
  return JSON.parse(content);
}

/**
 * 保存原始数据
 */
function saveRawData(district: string, schools: SchoolRaw[]) {
  const filePath = path.join(DATA_DIR, `scraped_${district}.json`);
  fs.writeFileSync(filePath, JSON.stringify({
    updatedAt: new Date().toISOString(),
    count: schools.length,
    schools
  }, null, 2));
  console.log(`💾 Saved ${schools.length} schools to ${filePath}`);
}

// ============ 核心爬虫逻辑 ============

/**
 * 爬取单个数据源
 */
async function scrapeSource(source: SourceConfig): Promise<SchoolRaw[]> {
  console.log(`\n📥 Scraping: ${source.name} (${source.district})`);
  console.log(`   URL: ${source.url}`);
  
  const schools: SchoolRaw[] = [];
  
  try {
    // 1. 获取列表页
    const html = await fetchPage(source.url);
    
    // 2. 提取学校链接
    const links = extractLinks(html, 'a');
    console.log(`   Found ${links.length} school links`);
    
    // 3. 遍历每个学校获取详情
    for (const link of links.slice(0, 20)) { // 限制数量，先测试
      try {
        console.log(`   → Fetching: ${link.text}`);
        
        const detailHtml = await fetchPage(link.href);
        const detail = parseSchoolDetail(detailHtml, link.href);
        
        const school: SchoolRaw = {
          name: detail.name || link.text,
          type: detail.type || inferType(link.text),
          district: source.district,
          address: detail.address,
          features: detail.features,
          source: source.url
        };
        
        schools.push(school);
        
        // 礼貌性延迟
        await new Promise(r => setTimeout(r, 500));
      } catch (e: any) {
        console.log(`   ⚠️ Failed to fetch ${link.href}: ${e.message}`);
      }
    }
    
  } catch (e: any) {
    console.error(`   ❌ Error scraping ${source.name}: ${e.message}`);
  }
  
  return schools;
}

/**
 * 从名称推断学校类型
 */
function inferType(name: string): string {
  if (name.includes('小学')) return '小学';
  if (name.includes('中学') || name.includes('初中')) return '初中';
  if (name.includes('九年一贯')) return '九年一贯制';
  return '小学'; // 默认
}

/**
 * 发现新数据源 (Tavily)
 */
async function discoverSources(query: string): Promise<string[]> {
  console.log(`\n🔍 Discovering sources with query: "${query}"`);
  
  const results = await tavilySearch(query, 5);
  const urls = results.map((r: any) => r.url).filter(Boolean);
  
  console.log(`   Found ${urls.length} URLs`);
  urls.forEach((url: string, i: number) => console.log(`   ${i + 1}. ${url}`));
  
  return urls;
}

/**
 * 导入数据到数据库 (Prisma)
 */
async function importToDatabase(schools: SchoolRaw[]): Promise<number> {
  let imported = 0;
  
  for (const school of schools) {
    try {
      await prisma.school.upsert({
        where: { 
          id: `${school.district}-${school.name}`.toLowerCase().replace(/\s+/g, '-')
        },
        update: {
          name: school.name,
          type: school.type || '小学',
          district: school.district,
          address: school.address,
          features: school.features,
          source: school.source,
          updatedAt: new Date()
        },
        create: {
          id: `${school.district}-${school.name}`.toLowerCase().replace(/\s+/g, '-'),
          name: school.name,
          type: school.type || '小学',
          district: school.district,
          address: school.address,
          features: school.features,
          source: school.source,
          cityId: 'Shanghai'
        }
      });
      imported++;
    } catch (e: any) {
      console.log(`   ⚠️ Failed to import ${school.name}: ${e.message}`);
    }
  }
  
  return imported;
}

// ============ CLI 入口 ============

async function main() {
  const args = process.argv.slice(2);
  
  console.log('🎓 School District Web - Auto Scraper');
  console.log('=====================================\n');
  
  // 解析参数
  const command = args[0];
  
  if (command === '--discover' || command === '-d') {
    // 发现模式
    const query = args.slice(1).join(' ') || '浦东新区 小学 初中学区划分 名录';
    const urls = await discoverSources(query);
    console.log('\n✅ Discovery complete');
    return;
  }
  
  if (command === '--all' || command === '-a') {
    // 全量爬取
    const sources = loadSources();
    let totalSchools = 0;
    
    for (const source of sources.sources) {
      const schools = await scrapeSource(source);
      saveRawData(source.district, schools);
      
      const imported = await importToDatabase(schools);
      console.log(`   📊 Imported ${imported} schools to database`);
      
      totalSchools += schools.length;
    }
    
    console.log(`\n✅ Complete! Total: ${totalSchools} schools scraped`);
    return;
  }
  
  if (command === '--source' || command === '-s') {
    // 单源爬取
    const sourceName = args[1];
    const sources = loadSources();
    const source = sources.sources.find(s => 
      s.name.includes(sourceName) || s.district.includes(sourceName)
    );
    
    if (!source) {
      console.error(`❌ Source not found: ${sourceName}`);
      console.log('Available sources:');
      sources.sources.forEach(s => console.log(`  - ${s.name} (${s.district})`));
      return;
    }
    
    const schools = await scrapeSource(source);
    saveRawData(source.district, schools);
    
    const imported = await importToDatabase(schools);
    console.log(`\n✅ ${source.name}: ${schools.length} scraped, ${imported} imported`);
    return;
  }
  
  if (command === '--import' || command === '-i') {
    // 仅导入已有数据文件
    const district = args[1] || 'pudong';
    const filePath = path.join(DATA_DIR, `scraped_${district}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const imported = await importToDatabase(data.schools);
    console.log(`✅ Imported ${imported} schools from ${filePath}`);
    return;
  }
  
  // 默认帮助
  console.log(`
Usage:
  npx ts-node scripts/auto_scraper.ts --discover "<query>"
    使用 Tavily 搜索发现数据源
  
  npx ts-node scripts/auto_scraper.ts --source <name>
    爬取指定数据源 (如: pudong, huangpu)
  
  npx ts-node scripts/auto_scraper.ts --all
    爬取所有配置的数据源
  
  npx ts-node scripts/auto_scraper.ts --import <district>
    仅将已有数据文件导入数据库

Examples:
  npx ts-node scripts/auto_scraper.ts --discover "上海 浦东新区 小学名单"
  npx ts-node scripts/auto_scraper.ts --source pudong
  npx ts-node scripts/auto_scraper.ts --all
  `);
}

// 执行
main()
  .then(() => {
    console.log('\n');
    process.exit(0);
  })
  .catch((e) => {
    console.error('\n❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
