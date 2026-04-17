import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Home, ArrowLeft, Calendar } from "lucide-react"
import { FavoriteButton } from "@/components/ui/favorite-button"

interface Props {
  params: Promise<{ id: string }>
}

export default async function CommunityDetailPage({ params }: Props) {
  const { id } = await params

  // 优先按 ID 查找（cuid 格式）
  let community = await prisma.community.findUnique({
    where: { id },
    include: {
      districts: {
        where: { year: 2025 },
        include: { school: true },
      },
    },
  })

  // 如果找不到，尝试按名称查找（slug 格式的 URL）
  if (!community) {
    const decodedName = decodeURIComponent(id)
    const cleanName = decodedName.replace(/^[a-z]+-/i, '')
    community = await prisma.community.findFirst({
      where: {
        OR: [
          { name: decodedName },
          { name: cleanName },
          { name: { contains: cleanName } },
        ],
      },
      include: {
        districts: {
          where: { year: 2025 },
          include: { school: true },
        },
      },
    })
  }

  if (!community) notFound()

  // 对口学校：通过 SchoolDistrict junction table 查找
  const schoolDistrict = await prisma.schoolDistrict.findFirst({
    where: {
      communityId: community.id,
      year: 2025,
    },
    include: { school: true },
  })
  const communitySchool = schoolDistrict?.school || null

  // Get related houses
  const relatedHouses = await prisma.house.findMany({
    where: {
      communityId: community.id,
      status: "在售",
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
            <Link href="/communities" className="text-blue-600 font-medium">小区</Link>
            <Link href="/houses" className="text-gray-600 hover:text-gray-900">房源</Link>
            <Link href="/map" className="text-gray-600 hover:text-gray-900">地图</Link>
            <Link href="/favorites" className="text-gray-600 hover:text-gray-900">收藏</Link>
            <Link href="/policy" className="text-gray-600 hover:text-gray-900">政策</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Link href="/communities" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回小区列表
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Community Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{community.name}</CardTitle>
                    <div className="flex items-center gap-2 text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" />
                      {community.district} {community.address && `· ${community.address}`}
                    </div>
                  </div>
                  <FavoriteButton
                    type="community"
                    id={community.id}
                    name={community.name}
                    extra={{ district: community.district, avgPrice: community.avgPrice }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">小区均价</div>
                      <div className="font-medium text-orange-600">
                        {community.avgPrice ? `${community.avgPrice}元/平` : "-"}
                      </div>
                    </div>
                  </div>
                  {community.buildYear && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">建成年份</div>
                        <div className="font-medium">{community.buildYear}年</div>
                      </div>
                    </div>
                  )}
                </div>

                {community.developer && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">开发商</div>
                    <div className="font-medium">{community.developer}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 对口学校 */}
            {communitySchool && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">对口学校</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/schools/${communitySchool.id}`}>
                    <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="font-bold text-lg">{communitySchool.name}</div>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-1 rounded text-sm ${communitySchool.type === "小学" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {communitySchool.type}
                        </span>
                        {communitySchool.level && (
                          <span className="px-2 py-1 rounded text-sm bg-purple-100 text-purple-700">
                            {communitySchool.level}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        {communitySchool.district}
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* 风险提示 */}
            <Card className="mt-6 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <h3 className="font-bold text-orange-800 mb-2">⚠️ 风险提示</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• 学区划分可能因政策调整而变化，请以教育局官方公布为准</li>
                  <li>• 房源价格受市场影响波动，实际成交价可能有所不同</li>
                  <li>• 建议购房前实地考察并咨询相关部门确认学区信息</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">在售房源</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedHouses.length === 0 ? (
                  <div className="text-gray-500 text-sm">暂无在售房源</div>
                ) : (
                  relatedHouses.map((house) => (
                    <Link key={house.id} href={`/houses/${house.id}`}>
                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="font-medium text-sm">{house.title}</div>
                        <div className="flex justify-between mt-1">
                          <span className="text-orange-600 font-medium">{house.price}万</span>
                          <span className="text-sm text-gray-500">{house.area}平</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
                {relatedHouses.length > 0 && (
                  <Link href={`/houses?communityId=${community.id}`}>
                    <button className="w-full mt-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                      查看更多房源
                    </button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
