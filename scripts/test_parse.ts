#!/usr/bin/env npx ts-node
/**
 * 浦东学区数据解析 - 简化版
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const TEST_FILE = path.join(__dirname, '..', 'data', 'test_parse.txt');

async function main() {
  console.log('🧪 测试解析浦东学区数据\n');
  
  // 获取页面
  const url = 'https://www.pudong.gov.cn/zwgk/ywjy-jyjzdgz/2024/98/325560.html';
  console.log('获取:', url);
  
  try {
    const { stdout } = await execAsync(
      `curl -s "${url}" -H "User-Agent: Mozilla/5.0" | head -c 50000`,
      { timeout: 30000 }
    );
    
    // 清理
    let text = stdout.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<[^>]+>/g, '\n');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/\s+/g, ' ');
    
    // 保存测试文件
    fs.writeFileSync(TEST_FILE, text);
    console.log('已保存到:', TEST_FILE);
    
    // 找学校名称
    const schoolMatches = text.match(/上海市[^\n，,。；;、0-9]{5,35}?(?:中学|小学)[^\n]*/g);
    console.log('\n学校名称 (前10):');
    schoolMatches?.slice(0, 10).forEach((s, i) => console.log(`  ${i + 1}. ${s.substring(0, 40)}`));
    
    // 找街道
    const streetMatches = text.match(/[^\n]{1,10}街道/g);
    console.log('\n街道 (前10):');
    streetMatches?.slice(0, 10).forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    
    // 找小区
    const communityMatches = text.match(/[^\n]{2,20}?(?:花园|新城|公寓|小区|家园|苑|园|庭|府|城|居|港|滩|岛)[^\n]*/g);
    console.log('\n小区 (前10):');
    communityMatches?.slice(0, 10).forEach((s, i) => console.log(`  ${i + 1}. ${s.substring(0, 40)}`));
    
  } catch (e: any) {
    console.log('❌ 错误:', e.message);
  }
}

main();
