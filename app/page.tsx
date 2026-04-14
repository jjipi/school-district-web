import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Search, TrendingUp, School, Home } from "lucide-react"

export default async function HomePage() {
  // Get hot schools (top rated)
  const hotSchools = await prisma.school.findMany({
    orderBy: { rating: "desc" },
    take: 6,
  })

  // Get recent houses
  const recentHouses = await prisma.house.findMany({
    where: { status: "在售" },
    include: { community: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  })

  // Get stats
  const schoolCount = await prisma.school.count()
  const communityCount = await prisma.community.count()
  const houseCount = await prisma.house.count({ where: { status: "在售" } })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            🏠 上海学区房
          </h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/schools" className="text-gray-600 hover:text-gray-900">学校</Link>
            <Link href="/communities" className="text-gray-600 hover:text-gray-900">小区</Link>
            <Link href="/houses" className="text-gray-600 hover:text-gray-900">房源</Link>
            <Link href="/map" className="text-gray-600 hover:text-gray-900">地图</Link>
            <Link href="/favorites" className="text-gray-600 hover:text-gray-900">收藏</Link>
            <Link href="/policy" className="text-gray-600 hover:text-gray-900">政策</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-12">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              上海学区房查询
            </h2>
            <p className="text-gray-600 mb-8">
              帮助家长快速查询上海学校信息、学区划片、房源行情
            </p>

            {/* Quick Search */}
            <form action="/schools" className="max-w-xl mx-auto">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    name="q"
                    placeholder="搜索学校名称、小区名称..."
                    className="w-full h-12 pl-10 pr-4 rounded-lg border shadow-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  搜索
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Stats */}
        <section className="py-8 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{schoolCount}</div>
                <div className="text-sm text-gray-500">学校</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{communityCount}</div>
                <div className="text-sm text-gray-500">小区</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{houseCount}</div>
                <div className="text-sm text-gray-500">在售房源</div>
              </div>
            </div>
          </div>
        </section>

        {/* Hot Schools */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">热门学校</h3>
              <Link href="/schools" className="text-sm text-blue-600 hover:underline">
                查看全部 →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hotSchools.map((school) => (
                <Link key={school.id} href={`/schools/${school.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{school.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {school.district}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${school.type === "小学" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {school.type}
                        </span>
                        <span className="text-yellow-600">★ {school.rating?.toFixed(1)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Houses */}
        <section className="py-8 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">最新房源</h3>
              <Link href="/houses" className="text-sm text-blue-600 hover:underline">
                查看全部 →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentHouses.map((house) => (
                <Link key={house.id} href={`/houses/${house.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="font-medium text-sm">{house.title}</div>
                      <div className="text-sm text-gray-500">{house.community.name}</div>
                      <div className="text-lg text-orange-600 font-bold mt-2">{house.price}万</div>
                      <div className="text-sm text-gray-500">{house.area}平 · {house.rooms}室</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p>© 2026 上海学区房查询</p>
        </div>
      </footer>
    </div>
  )
}