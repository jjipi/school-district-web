import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.house.deleteMany()
  await prisma.community.deleteMany()
  await prisma.school.deleteMany()
  await prisma.schoolDistrict.deleteMany()

  // 小学数据
  const schools = [
    { name: "上海市第一师范学校附属小学", pinyin: "shanghaishi diyifanxuexiao", type: "小学", level: "市重点", district: "静安区", rating: 4.8, studentCount: 1200, teacherCount: 80, features: "体操、舞蹈", address: "静安寺街道" },
    { name: "静安区教育学院附属小学", pinyin: "jinganqu jiaoyuxueyuan fushu", type: "小学", level: "区重点", district: "静安区", rating: 4.6, studentCount: 900, teacherCount: 60, features: "双语、STEM", address: "江宁路街道" },
    { name: "虹口区第三中心小学", pinyin: "hongkouqu disanzhongxin", type: "小学", level: "区重点", district: "虹口区", rating: 4.5, studentCount: 850, teacherCount: 55, features: "艺术、科技", address: "欧阳路街道" },
    { name: "徐汇区高安路第一小学", pinyin: "xuhuiqu gaoanlu diyi", type: "小学", level: "市重点", district: "徐汇区", rating: 4.9, studentCount: 1400, teacherCount: 95, features: "英语、信息科技", address: "天平路街道" },
    { name: "闵行区实验小学", pinyin: "minhangqu shiyan", type: "小学", level: "区重点", district: "闵行区", rating: 4.4, studentCount: 1100, teacherCount: 70, features: "科创、阅读", address: "莘庄镇" },
    { name: "浦东新区明珠小学", pinyin: "pudongxinqu mingzhu", type: "小学", level: "区重点", district: "浦东新区", rating: 4.7, studentCount: 1800, teacherCount: 120, features: "英语、机器人", address: "潍坊街道" },
    { name: "黄浦区蓬莱路第二小学", pinyin: "huangpuqu penglailu di'er", type: "小学", level: "市重点", district: "黄浦区", rating: 4.6, studentCount: 950, teacherCount: 65, features: "民乐、足球", address: "老西门街道" },
    { name: "杨浦区打虎山路第一小学", pinyin: "yangpuqu dahusanlu diyi", type: "小学", level: "区重点", district: "杨浦区", rating: 4.5, studentCount: 1000, teacherCount: 68, features: "篮球、科创", address: "四平路街道" },
    { name: "长宁区江苏路第五小学", pinyin: "changningqu jiangsu lu diwu", type: "小学", level: "区重点", district: "长宁区", rating: 4.4, studentCount: 820, teacherCount: 52, features: "京剧、绘画", address: "江苏路街道" },
    { name: "普陀区华东师范大学附属小学", pinyin: "putuoqu huadong shifan daxue fushu", type: "小学", level: "市重点", district: "普陀区", rating: 4.8, studentCount: 1300, teacherCount: 88, features: "STEM、外语", address: "长寿路街道" },
    { name: "市西初级中学", pinyin: "shixi chuji zhongxue", type: "初中", level: "市重点", district: "静安区", rating: 4.7, studentCount: 1100, teacherCount: 90, features: "理科竞赛", address: "静安寺街道" },
    { name: "市北初级中学", pinyin: "shibei chuji zhongxue", type: "初中", level: "市重点", district: "静安区", rating: 4.6, studentCount: 1000, teacherCount: 82, features: "科技创新", address: "临汾路街道" },
    { name: "延安初级中学", pinyin: "yan'an chuji zhongxue", type: "初中", level: "市重点", district: "长宁区", rating: 4.8, studentCount: 1200, teacherCount: 95, features: "数学、外语", address: "新华路街道" },
    { name: "市三女子初级中学", pinyin: "shisan nuzi chuji zhongxue", type: "初中", level: "市重点", district: "黄浦区", rating: 4.7, studentCount: 800, teacherCount: 70, features: "文科", address: "豫园街道" },
    { name: "格致初级中学", pinyin: "gezhi chuji zhongxue", type: "初中", level: "市重点", district: "黄浦区", rating: 4.6, studentCount: 950, teacherCount: 78, features: "理科", address: "外滩街道" },
  ]

  const createdSchools = await Promise.all(schools.map(s => prisma.school.create({ data: s })))

  // 小区数据
  const communities = [
    { name: "静安枫景苑", pinyin: "jing'an fengjing", district: "静安区", buildYear: 2015, developer: "华润", avgPrice: 85000, schoolId: createdSchools[0].id },
    { name: "静安豪景苑", pinyin: "jing'an haojing", district: "静安区", buildYear: 2018, developer: "九龙仓", avgPrice: 92000, schoolId: createdSchools[0].id },
    { name: "远中风华园", pinyin: "yuanzhong fenghua", district: "静安区", buildYear: 2012, developer: "远中集团", avgPrice: 78000, schoolId: createdSchools[1].id },
    { name: "凯迪克大厦", pinyin: "kaidike dasha", district: "静安区", buildYear: 2008, developer: "凯迪克", avgPrice: 72000, schoolId: createdSchools[0].id },
    { name: "中凯城市之光", pinyin: "zhongkai chengshi zhi guang", district: "静安区", buildYear: 2010, developer: "中凯", avgPrice: 81000, schoolId: createdSchools[0].id },
    { name: "茂名大厦", pinyin: "maoming dasha", district: "静安区", buildYear: 2005, developer: "茂名房产", avgPrice: 68000, schoolId: createdSchools[1].id },
  ]

  const createdCommunities = await Promise.all(communities.map(c => prisma.community.create({ data: c })))

  // 房源数据
  const houses = [
    { communityId: createdCommunities[0].id, title: "静安枫景苑 2室1厅 精装", price: 680, unitPrice: 85000, area: 80, rooms: 2, halls: 1, floor: 15, totalFloor: 28, orientation: "南", decoration: "精装修", status: "在售" },
    { communityId: createdCommunities[0].id, title: "静安枫景苑 3室2厅 精装", price: 950, unitPrice: 82000, area: 116, rooms: 3, halls: 2, floor: 20, totalFloor: 28, orientation: "南", decoration: "精装修", status: "在售" },
    { communityId: createdCommunities[1].id, title: "静安豪景苑 2室2厅 豪华装修", price: 850, unitPrice: 92000, area: 92, rooms: 2, halls: 2, floor: 12, totalFloor: 30, orientation: "南", decoration: "豪华装修", status: "在售" },
    { communityId: createdCommunities[1].id, title: "静安豪景苑 4室2厅 豪华装修", price: 1380, unitPrice: 90000, area: 153, rooms: 4, halls: 2, floor: 18, totalFloor: 30, orientation: "南北", decoration: "豪华装修", status: "在售" },
    { communityId: createdCommunities[2].id, title: "远中风华园 1室1厅", price: 450, unitPrice: 78000, area: 58, rooms: 1, halls: 1, floor: 8, totalFloor: 22, orientation: "南", decoration: "精装修", status: "在售" },
    { communityId: createdCommunities[2].id, title: "远中风华园 3室1厅", price: 750, unitPrice: 76000, area: 99, rooms: 3, halls: 1, floor: 16, totalFloor: 22, orientation: "南", decoration: "简装", status: "在售" },
    { communityId: createdCommunities[3].id, title: "凯迪克大厦 2室1厅", price: 520, unitPrice: 72000, area: 72, rooms: 2, halls: 1, floor: 10, totalFloor: 24, orientation: "南", decoration: "精装修", status: "在售" },
    { communityId: createdCommunities[4].id, title: "中凯城市之光 3室2厅", price: 890, unitPrice: 81000, area: 110, rooms: 3, halls: 2, floor: 22, totalFloor: 26, orientation: "南北", decoration: "精装修", status: "在售" },
  ]

  await Promise.all(houses.map(h => prisma.house.create({ data: h })))

  console.log("✅ Seeded:", createdSchools.length, "schools,", createdCommunities.length, "communities,", houses.length, "houses")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())