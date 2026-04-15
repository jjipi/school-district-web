/**
 * 导入 2025年浦东新区公办初中招生地段公示 数据
 * 用法: node scripts/import_pudong_junior_2025.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DATA_FILE = path.join(__dirname, '../data/pudong_junior_2025_raw.jsonl');
const YEAR = 2025;

async function loadScrapedData() {
  const lines = fs.readFileSync(DATA_FILE, 'utf-8').split('\n').filter(Boolean);
  const seen = new Set();
  const entries = [];

  for (const line of lines) {
    const d = JSON.parse(line);
    const schoolName = (d.school_name || '').trim();
    const address = (d.address || '').trim();
    const community = (d.community || '').trim();
    const streetTown = (d.street_town || '').trim();
    const notes = (d.notes || '').trim();

    // 过滤无效条目
    if (!schoolName || ['学校名称', '招收年级', '统筹安排', '信息变更', ''].includes(schoolName)) {
      continue;
    }
    if (!address) continue;

    const key = `${schoolName}|${address}`;
    if (seen.has(key)) continue;
    seen.add(key);

    entries.push({ schoolName, address, streetTown, community, notes });
  }

  return entries;
}

async function main() {
  console.log('连接数据库...');
  await prisma.$connect();
  console.log('连接成功');

  const entries = await loadScrapedData();
  console.log(`加载数据: ${entries.length} 条`);

  // 按学校分组
  const bySchool = {};
  for (const e of entries) {
    if (!bySchool[e.schoolName]) bySchool[e.schoolName] = [];
    bySchool[e.schoolName].push(e);
  }
  const schoolNames = Object.keys(bySchool);
  console.log(`涉及学校: ${schoolNames.length} 所`);

  const stats = { schoolsNew: 0, schoolsExist: 0, communitiesNew: 0, districtsNew: 0, districtsExist: 0 };

  for (const schoolName of schoolNames) {
    const schoolEntries = bySchool[schoolName];

    // 找或建学校
    let school = await prisma.school.findFirst({
      where: { name: schoolName, district: '浦东新区' },
    });

    if (!school) {
      school = await prisma.school.create({
        data: {
          name: schoolName,
          type: '初中',
          district: '浦东新区',
          cityId: 'Shanghai',
          source: 'pudong.gov.cn 2025 初中招生地段',
        },
      });
      console.log(`  + 新建学校: ${schoolName}`);
      stats.schoolsNew++;
    } else {
      stats.schoolsExist++;
    }

    // 收集该校所有小区
    const communitySet = new Set();
    for (const e of schoolEntries) {
      if (e.community) {
        communitySet.add(JSON.stringify({ name: e.community, streetTown: e.streetTown }));
      }
    }

    for (const commStr of communitySet) {
      const { name: commName, streetTown } = JSON.parse(commStr);

      // 找或建小区
      let community = await prisma.community.findFirst({
        where: { name: commName, district: '浦东新区' },
      });

      if (!community) {
        community = await prisma.community.create({
          data: {
            name: commName,
            district: '浦东新区',
            cityId: 'Shanghai',
            source: 'pudong.gov.cn 2025 初中招生地段',
          },
        });
        console.log(`    + 新建小区: ${commName}`);
        stats.communitiesNew++;
      }

      // 建学区关联
      const existing = await prisma.schoolDistrict.findFirst({
        where: { schoolId: school.id, communityId: community.id, year: YEAR },
      });

      if (!existing) {
        await prisma.schoolDistrict.create({
          data: {
            schoolId: school.id,
            communityId: community.id,
            year: YEAR,
            admissionType: '对口招生',
          },
        });
        stats.districtsNew++;
      } else {
        stats.districtsExist++;
      }
    }
  }

  console.log('\n=== 导入完成 ===');
  console.log(`学校: 新建 ${stats.schoolsNew}, 已有 ${stats.schoolsExist}`);
  console.log(`小区: 新建 ${stats.communitiesNew}`);
  console.log(`学区关联: 新增 ${stats.districtsNew}, 已有 ${stats.districtsExist}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
