#!/usr/bin/env node
/**
 * 解析浦东对口地段数据
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'pudong_districts_full.json');

// 从web_fetch获取的原始文本
const raw = fs.readFileSync('/dev/stdin', 'utf-8');

// 清理
let text = raw.replace(/&nbsp;/g, ' ');
text = text.replace(/<[^>]+>/g, '\n');
text = text.replace(/\n+/g, '\n');
text = text.replace(/^\s+|\s+$/g, '');

// 按"街道"分割
const segments = text.split('街道');

const results = [];
let currentSchool = '';

for (let i = 0; i < segments.length - 1; i++) {
  const seg = segments[i];
  const next = segments[i + 1];
  
  // 从seg中找学校名
  const lines = seg.split('\n').filter(l => l.trim());
  const lastLines = lines.slice(-3);
  
  let schoolName = '';
  for (let j = lastLines.length - 1; j >= 0; j--) {
    const l = lastLines[j].trim();
    if (l.includes('中学') || l.includes('小学')) {
      schoolName = l.replace(/[^\u4e00-\u9fa5A-Za-z0-9（）\(\)]/g, '').trim();
      break;
    }
  }
  
  if (!schoolName) continue;
  
  // 从next中提取小区名
  const nextLines = next.split('\n').filter(l => l.trim());
  let community = '';
  let address = '';
  
  for (const line of nextLines) {
    const l = line.trim();
    if (!l) continue;
    
    // 检查是否包含小区关键词
    if (l.match(/花园|新城|公寓|小区|家园|苑|园|庭|府|城|居|港|滩|岛|湾|里|坊|厦|楼|栋|座/)) {
      community = l.replace(/[^\u4e00-\u9fa5A-Za-z0-9（）\(\)]/g, '').trim();
      break;
    }
  }
  
  if (community && schoolName) {
    results.push({
      schoolName,
      community,
      street: seg.slice(-10).replace(/[^\u4e00-\u9fa5]/g, ''),
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

// 保存
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE, JSON.stringify(unique, null, 2));

console.error(`解析完成: ${unique.length} 条`);
console.error(`样例 (前3):`);
unique.slice(0, 3).forEach((r, i) => {
  console.error(`${i+1}. ${r.schoolName} → ${r.community} (${r.street})`);
});
