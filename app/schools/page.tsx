import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { School, MapPin, Users, GraduationCap, Star } from "lucide-react"

export const dynamic = "force-dynamic"

interface SearchParams {
  q?: string
  type?: string
  district?: string
}

export default async function SchoolsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const q = params.q || ""
  const type = params.type || ""
  const district = params.district || ""

  const where: any = {}
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { pinyin: { contains: q.toLowerCase() } },
    ]
  }
  if (type) where.type = type
  if (district) where.district = district

  const schools = await prisma.school.findMany({
    where,
    orderBy: { rating: "desc" },
    take: 50,
  })

  const districts = await prisma.school.findMany({
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
  })
  const districtList = districts.map(s => s.district)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        <h1 className="text-2xl font-bold mb-6">学校搜索</h1>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <form className="flex gap-3 flex-wrap">
              <Input
                name="q"
                placeholder="搜索学校名称..."
                defaultValue={q}
                className="flex-1 min-w-[200px]"
              />
              <select name="type" defaultValue={type} className="h-10 px-3 rounded-md border bg-background">
                <option value="">全学段</option>
                <option value="小学">小学</option>
                <option value="初中">初中</option>
              </select>
              <select name="district" defaultValue={district} className="h-10 px-3 rounded-md border bg-background">
                <option value="">全区域</option>
                {districtList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <Button type="submit">搜索</Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schools.map((school) => (
            <Link key={school.id} href={`/schools/${school.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{school.name}</CardTitle>
                    {school.rating && (
                      <div className="flex items-center text-sm text-yellow-600">
                        <Star className="w-4 h-4 fill-yellow-500" />
                        {school.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${school.type === "小学" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                      {school.type}
                    </span>
                    {school.level && <span className="text-xs">{school.level}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {school.district}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="w-4 h-4" />
                    {school.studentCount} 人
                  </div>
                  {school.features && (
                    <div className="mt-2 text-xs text-gray-500">
                      特色：{school.features}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {schools.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无学校数据
          </div>
        )}
      </main>
    </div>
  )
}