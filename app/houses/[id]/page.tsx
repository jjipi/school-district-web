import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Home, ArrowLeft, Calendar, Building } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default async function HouseDetailPage({ params }: Props) {
  const { id } = await params

  const house = await prisma.house.findUnique({
    where: { id },
    include: {
      community: {
        include: {
          school: true,
        },
      },
    },
  })

  if (!house) notFound()

  // Get related houses in same community
  const relatedHouses = await prisma.house.findMany({
    where: {
      communityId: house.communityId,
      status: "在售",
      id: { not: house.id },
    },
    take: 4,
    orderBy: { price: "asc" },
  })

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
            <Link href="/policy" className="text-gray-600 hover:text-gray-900">政策</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Link href="/houses" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回房源列表
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* House Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{house.title}</CardTitle>
                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <MapPin className="w-4 h-4" />
                  {house.community.name}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-orange-600">{house.price}</span>
                  <span className="text-lg text-gray-600">万</span>
                  <span className="text-gray-500 ml-4">
                    {house.unitPrice}元/平
                  </span>
                </div>

                {/* Basic Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-500">面积</div>
                    <div className="font-medium">{house.area}平</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">户型</div>
                    <div className="font-medium">{house.rooms}室{house.halls}厅</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">楼层</div>
                    <div className="font-medium">
                      {house.floor ? `${house.floor}/${house.totalFloor || "?"}层` : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">朝向</div>
                    <div className="font-medium">{house.orientation || "-"}</div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-2">
                  {house.decoration && (
                    <div className="flex gap-4">
                      <span className="text-gray-500">装修：</span>
                      <span>{house.decoration}</span>
                    </div>
                  )}
                  {house.status && (
                    <div className="flex gap-4">
                      <span className="text-gray-500">状态：</span>
                      <span className="text-green-600">{house.status}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Community Info */}
            {house.community && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">所在小区</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/communities/${house.community.id}`}>
                    <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="font-bold text-lg">{house.community.name}</div>
                      <div className="flex items-center gap-2 text-gray-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        {house.community.district}
                      </div>
                      {house.community.avgPrice && (
                        <div className="text-orange-600 font-medium mt-2">
                          均价：{house.community.avgPrice}元/平
                        </div>
                      )}
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* School Info */}
            {house.community?.school && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">对口学校</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/schools/${house.community.school.id}`}>
                    <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="font-bold text-lg">{house.community.school.name}</div>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-1 rounded text-sm ${house.community.school.type === "小学" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {house.community.school.type}
                        </span>
                        <span className="px-2 py-1 rounded text-sm bg-gray-100 text-gray-700">
                          {house.community.school.district}
                        </span>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Risk Warning */}
            <Card className="mt-6 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <h3 className="font-bold text-orange-800 mb-2">⚠️ 风险提示</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• 学区划分可能因政策调整而变化，请以教育局官方公布为准</li>
                  <li>• 房源价格受市场影响波动，实际成交价可能有所不同</li>
                  <li>• 购房前请实地考察，确认房屋实际状况</li>
                  <li>• 建议咨询专业房产经纪获取最新市场信息</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">同小区其他房源</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedHouses.length === 0 ? (
                  <div className="text-gray-500 text-sm">暂无其他房源</div>
                ) : (
                  relatedHouses.map((h) => (
                    <Link key={h.id} href={`/houses/${h.id}`}>
                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="font-medium text-sm">{h.title}</div>
                        <div className="flex justify-between mt-1">
                          <span className="text-orange-600 font-medium">{h.price}万</span>
                          <span className="text-sm text-gray-500">{h.area}平</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
