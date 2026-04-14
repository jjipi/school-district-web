import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Search, Home } from "lucide-react"

interface Props {
  searchParams: Promise<{ district?: string; q?: string }>
}

export default async function CommunitiesPage({ searchParams }: Props) {
  const { district, q } = await searchParams

  const districts = await prisma.community.groupBy({
    by: ["district"],
    _count: { id: true },
  })

  const communities = await prisma.community.findMany({
    where: {
      ...(district && { district }),
      ...(q && {
        name: { contains: q },
      }),
    },
    include: { school: true },
    orderBy: { name: "asc" },
    take: 100,
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
        <h1 className="text-2xl font-bold mb-6">小区列表</h1>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <form className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <select
                  name="district"
                  defaultValue={district || ""}
                  className="h-10 px-3 rounded-md border bg-white"
                >
                  <option value="">全区域</option>
                  {districts.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district} ({d._count.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  name="q"
                  defaultValue={q || ""}
                  placeholder="搜索小区名称..."
                  className="h-10 px-3 rounded-md border flex-1"
                />
              </div>
              <button
                type="submit"
                className="h-10 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                搜索
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {communities.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              未找到小区
            </div>
          ) : (
            communities.map((community) => (
              <Link key={community.id} href={`/communities/${community.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{community.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {community.district}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {community.school && (
                      <div className="text-sm">
                        <span className="text-gray-500">对口学校：</span>
                        <span className="text-blue-600">{community.school.name}</span>
                      </div>
                    )}
                    {community.avgPrice && (
                      <div className="text-lg text-orange-600 font-bold">
                        {community.avgPrice}元/平
                      </div>
                    )}
                    {community.address && (
                      <div className="text-sm text-gray-500 truncate">
                        {community.address}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
