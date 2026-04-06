import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ExternalLink } from "lucide-react"

const policies = [
  {
    district: "上海市",
    name: "2025年义务教育招生入学工作实施意见",
    url: "https://edu.shanghai.gov.cn/",
    content: '全市义务教育阶段学校招生入学工作统一使用"上海市义务教育入学报名系统"，采用"公民同招"办法。',
  },
  {
    district: "浦东新区",
    name: "浦东新区2025年义务教育阶段学校招生入学实施细则",
    url: "https://www.pudong.gov.cn/",
    content: '公办学校实行"户籍对口"或"居住地对口"招生办法，民办学校实行"电脑随机录取"。',
  },
  {
    district: "徐汇区",
    name: "徐汇区2025年义务教育阶段学校招生入学工作实施细则",
    url: "https://www.xuhui.gov.cn/",
    content: '公办小学实行"户籍对口"原则，公办初中实行"小学对口"或"户籍对口"两种模式。',
  },
  {
    district: "黄浦区",
    name: "黄浦区2025年义务教育阶段学校招生入学工作实施办法",
    url: "https://www.huangpu.gov.cn/",
    content: '采用"户籍对口"招生办法，同时保留一定比例的电脑派位名额。',
  },
  {
    district: "静安区",
    name: "静安区2025年义务教育阶段学校招生入学工作实施细则",
    url: "https://www.jingan.gov.cn/",
    content: '公办学校实行"户籍对口"招生，民办学校实行"电脑随机录取"。',
  },
  {
    district: "长宁区",
    name: "长宁区2025年义务教育阶段学校招生入学工作实施细则",
    url: "https://www.shcn.gov.cn/",
    content: '采用"户籍对口"与"居住地对口"相结合的招生办法。',
  },
  {
    district: "普陀区",
    name: "普陀区2025年义务教育阶段学校招生入学工作实施细则",
    url: "https://www.shpt.gov.cn/",
    content: '公办学校实行"户籍对口"招生办法。',
  },
  {
    district: "杨浦区",
    name: "杨浦区2025年义务教育阶段学校招生入学工作实施细则",
    url: "https://www.shyp.gov.cn/",
    content: '采用"户籍对口"招生办法，部分学校实施"电脑派位"。',
  },
]

const keyPoints = [
  {
    title: "公民同招",
    description: "公办和民办学校同步招生，民办学校超额后电脑随机录取。",
  },
  {
    title: "人户一致",
    description: "户籍地址与实际居住地一致的情况下，优先统筹安排入学。",
  },
  {
    title: "五年一户",
    description: "部分区实行同一地址五年内只安排一次入学（双胞胎、二孩除外）。",
  },
  {
    title: "积分入学",
    description: "非沪籍子女需满足《上海市居住证》积分达标等条件。",
  },
]

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            🏠 上海学区房
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/schools" className="text-gray-600 hover:text-gray-900">学校</Link>
            <Link href="/communities" className="text-gray-600 hover:text-gray-900">小区</Link>
            <Link href="/houses" className="text-gray-600 hover:text-gray-900">房源</Link>
            <Link href="/policy" className="text-blue-600 font-medium">政策</Link>
            <Link href="/map" className="text-gray-600 hover:text-gray-900">地图</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">升学政策中心</h1>

        {/* Key Points */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📌 核心概念
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {keyPoints.map((point) => (
                <div key={point.title} className="p-4 bg-white rounded-lg border">
                  <h3 className="font-bold text-blue-700">{point.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{point.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* District Policies */}
        <h2 className="text-lg font-bold mb-4">各区招生政策</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {policies.map((policy) => (
            <Card key={policy.district} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{policy.district}</CardTitle>
                  <a
                    href={policy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    官网
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm">{policy.name}</h3>
                    <p className="text-sm text-gray-600 mt-2">{policy.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Disclaimer */}
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4 text-sm text-orange-800">
            <strong>⚠️ 免责声明：</strong>本页面政策信息仅供参考，具体招生政策以各区教育局官方发布为准。建议家长在入学前咨询所在区教育局获取最新信息。
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
