import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Users, Star, BookOpen, Award, ArrowLeft } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default async function SchoolDetailPage({ params }: Props) {
  const { id } = await params
  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      communities: true,
    },
  })

  if (!school) notFound()

  // Get related houses
  const relatedHouses = await prisma.house.findMany({
    where: {
      community: {
        schoolId: school.id,
      },
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
            <Link href="/schools" className="text-blue-600 font-medium">学校</Link>
            <Link href="/communities" className="text-gray-600 hover:text-gray-900">小区</Link>
            <Link href="/houses" className="text-gray-600 hover:text-gray-900">房源</Link>
            <Link href="/policy" className="text-gray-600 hover:text-gray-900">政策</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Link href="/schools" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回学校列表
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* School Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{school.name}</CardTitle>
                  {school.rating && (
                    <div className="flex items-center text-lg text-yellow-600">
                      <Star className="w-5 h-5 fill-yellow-500 mr-1" />
                      {school.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-sm ${school.type === "小学" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {school.type}
                  </span>
                  {school.level && (
                    <span className="px-2 py-1 rounded text-sm bg-purple-100 text-purple-700">
                      {school.level}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-5 h-5" />
                  {school.district} {school.address}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">学生人数</div>
                      <div className="font-medium">{school.studentCount || "-"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">教师人数</div>
                      <div className="font-medium">{school.teacherCount || "-"}</div>
                    </div>
                  </div>
                </div>
                {school.features && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">学校特色</div>
                    <div className="flex flex-wrap gap-2">
                      {school.features.split("、").map((f, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 对口小区 */}
            {school.communities.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">对口小区</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {school.communities.map((c) => (
                      <Link key={c.id} href={`/communities/${c.id}`}>
                        <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-sm text-gray-500">
                            {c.district} · {c.buildYear}年建成
                          </div>
                          <div className="text-sm text-orange-600 mt-1">
                            均价 {c.avgPrice?.toLocaleString()} 元/平
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 风险提示 */}
            <Card className="mt-6 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <h3 className="font-bold text-orange-800 mb-2">⚠️ 风险提示</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• 学区划分可能因政策调整而变化，请以教育局官方公布为准</li>
                  <li>• 部分学校实行"五年一户"政策，同一地址五年内只安排一次入学</li>
                  <li>• 热门学校可能存在学位紧张情况，建议提前了解学校招生简章</li>
                  <li>• 购房前请确认房产是否在学区范围内，并咨询相关部门</li>
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
                  <Link href={`/houses?schoolId=${school.id}`}>
                    <Button variant="outline" className="w-full mt-2">
                      查看更多房源
                    </Button>
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