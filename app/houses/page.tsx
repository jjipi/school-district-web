import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Home, Building2 } from "lucide-react"

export const dynamic = "force-dynamic"

interface SearchParams {
  q?: string
  district?: string
  minPrice?: string
  maxPrice?: string
  rooms?: string
}

export default async function HousesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const q = params.q || ""
  const district = params.district || ""
  const minPrice = params.minPrice ? parseInt(params.minPrice) : 0
  const maxPrice = params.maxPrice ? parseInt(params.maxPrice) : 99999
  const rooms = params.rooms ? parseInt(params.rooms) : 0

  const where: any = {
    price: { gte: minPrice, lte: maxPrice },
    status: "在售",
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { community: { name: { contains: q } } },
    ]
  }
  if (district) where.community = { district }
  if (rooms) where.rooms = rooms

  const houses = await prisma.house.findMany({
    where,
    include: { community: true },
    orderBy: { price: "asc" },
    take: 50,
  })

  const communities = await prisma.community.findMany({
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
  })
  const districts = communities.map(c => c.district)

  // Group by price range
  const priceRanges = [
    { label: "500万以下", min: 0, max: 500 },
    { label: "500-800万", min: 500, max: 800 },
    { label: "800-1000万", min: 800, max: 1000 },
    { label: "1000万以上", min: 1000, max: 99999 },
  ]

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
            <Link href="/houses" className="text-blue-600 font-medium">房源</Link>
            <Link href="/map" className="text-gray-600 hover:text-gray-900">地图</Link>
            <Link href="/favorites" className="text-gray-600 hover:text-gray-900">收藏</Link>
            <Link href="/policy" className="text-gray-600 hover:text-gray-900">政策</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">房源列表</h1>

        <Card className="mb-6">
          <CardContent className="p-4">
            <form className="flex gap-3 flex-wrap">
              <Input
                name="q"
                placeholder="搜索小区或房源..."
                defaultValue={q}
                className="flex-1 min-w-[200px]"
              />
              <select name="district" defaultValue={district} className="h-10 px-3 rounded-md border bg-background">
                <option value="">全区域</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select name="rooms" defaultValue={rooms.toString()} className="h-10 px-3 rounded-md border bg-background">
                <option value="0">几室</option>
                <option value="1">1室</option>
                <option value="2">2室</option>
                <option value="3">3室</option>
                <option value="4">4室及以上</option>
              </select>
              <Button type="submit">筛选</Button>
            </form>

            <div className="flex gap-2 mt-3 flex-wrap">
              {priceRanges.map((range) => (
                <Link
                  key={range.label}
                  href={`/houses?minPrice=${range.min}&maxPrice=${range.max}`}
                  className="px-3 py-1 rounded-full bg-gray-100 text-sm hover:bg-gray-200"
                >
                  {range.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {houses.map((house) => (
            <Link key={house.id} href={`/houses/${house.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{house.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {house.community.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg text-orange-600 font-bold">
                    {house.price}万
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {house.unitPrice.toLocaleString()} 元/平 · {house.rooms}室{house.halls}厅
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {house.area}平 / {house.floor}/{house.totalFloor}层 · {house.orientation}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {houses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无房源数据
          </div>
        )}
      </main>
    </div>
  )
}