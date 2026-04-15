"""
2025年浦东新区公办初中招生地段公示 爬虫
URL: https://www.shanghai.gov.cn/pdxqywjy/20250507/79de2fd60f4a42099fad4acc7aa78922.html
"""

import scrapy
import json
from datetime import datetime


class JuniorSchoolSpider(scrapy.Spider):
    name = 'junior_school'
    allowed_domains = ['www.shanghai.gov.cn']
    start_urls = [
        'https://www.shanghai.gov.cn/pdxqywjy/20250507/79de2fd60f4a42099fad4acc7aa78922.html'
    ]

    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'ROBOTSTXT_OBEY': False,
        'DOWNLOAD_DELAY': 1,
        'TELNETCONSOLE_ENABLED': False,
    }

    def parse(self, response):
        """解析表格数据"""
        # 找到所有表格行
        rows = response.xpath('//table//tr')

        results = []
        current_school = None
        current_grade = None

        for row in rows:
            cells = row.xpath('.//td')
            if len(cells) < 7:
                continue

            # 提取每个单元格文本
            grade = cells[0].xpath('normalize-space(.)').get()
            seq = cells[1].xpath('normalize-space(.)').get()
            school_name = cells[2].xpath('normalize-space(.)').get()
            address = cells[3].xpath('normalize-space(.)').get()
            street_town = cells[4].xpath('normalize-space(.)').get()
            community = cells[5].xpath('normalize-space(.)').get()
            notes = cells[6].xpath('normalize-space(.)').get()

            # 跳过表头
            if '招收年级' in grade or not school_name or school_name == '学校名称':
                continue

            # 过滤无效行（只有序号没有学校名的）
            if not school_name or school_name.strip() == '':
                continue

            item = {
                'grade': grade.strip() if grade else '',
                'seq': seq.strip() if seq else '',
                'school_name': school_name.strip(),
                'address': address.strip() if address else '',
                'street_town': street_town.strip() if street_town else '',
                'community': community.strip() if community else '',
                'notes': notes.strip() if notes else '',
                'source_url': response.url,
                'crawled_at': datetime.now().isoformat(),
            }
            results.append(item)

        # 输出所有数据
        for item in results:
            yield item

        # 同时保存完整结果到文件
        self.logger.info(f'共抓取 {len(results)} 条数据')

    def closed(self, reason):
        self.logger.info(f'Spider 关闭: {reason}')
