"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { School, Home, Trash2, MapPin, Star, Heart } from "lucide-react"

interface FavoriteSchool {
  id: string
  name: string
  type: string
  district: string
  rating: number | null
  level: string | null
}

interface FavoriteCommunity {
  id: string
  name: string
  district: string
  avgPrice: number | null
  address: string | null
}

interface FavoriteHouse {
  id: string
  title: string
  price: number
  unitPrice: number
  area: number
  rooms: number
  halls: number
  communityName: string
}

type Tab = "schools" | "communities" | "houses"

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("schools")
  const [schools, setSchools] = useState<FavoriteSchool[]>([])
  const [communities, setCommunities] = useState<FavoriteCommunity[]>([])
  const [houses, setHouses] = useState<FavoriteHouse[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    loadFavorites()
  }, [])

  function loadFavorites() {
    try {
      const stored = localStorage.getItem("favorites")
      if (stored) {
        const favorites = JSON.parse(stored)
        setSchools(favorites.schools || [])
        setCommunities(favorites.communities || [])
        setHouses(favorites.houses || [])
      }
    } catch (error) {
      console.error("Failed to load favorites:", error)
    }
  }

  function removeSchool(id: string) {
    const updated = schools.filter(s => s.id !== id)
    setSchools(updated)
    saveFavorites({ schools: updated, communities, houses })
  }

  function removeCommunity(id: string) {
    const updated = communities.filter(c => c.id !== id)
    setCommunities(updated)
    saveFavorites({ schools, communities: updated, houses })
  }

  function removeHouse(id: string) {
    const updated = houses.filter(h => h.id !== id)
    setHouses(updated)
    saveFavorites({ schools, communities, houses: updated })
  }

  function saveFavorites(data: { schools: FavoriteSchool[]; communities: FavoriteCommunity[]; houses: FavoriteHouse[] }) {
    localStorage.setItem("favorites", JSON.stringify(data))
  }

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              🏠 上海学区房
            </Link>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            🏠 上海学区房
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/schools" className="text-gray-600 hover:text-gray-900">学校</Link>
            <Link href="/communities" className="text-gray-600 hover:text-gray-900">小区</Link>
            <Link href="/houses" className="text-gray-600 hover:text-gray-900">房源</Link>
            <Link href="/map" className="text-gray-600 hover:text-gray-900">地图</Link>
            <Link href="/favorites" className="text-blue-600 font-medium">收藏</Link>
            <Link href="/policy" className="text-gray-600 hover:text-gray-900">政策</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-bold">我的收藏</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("schools")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "schools"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <School className="w-4 h-4 inline mr-1" />
            学校 ({schools.length})
          </button>
          <button
            onClick={() => setActiveTab("communities")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "communities"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Home className="w-4 h-4 inline mr-1" />
            小区 ({communities.length})
          </button>
          <button
            onClick={() => setActiveTab("houses")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "houses"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            🏠 房源 ({houses.length})
          </button>
        </div>

        {/* Schools Tab */}
        {activeTab === "schools" && (
          <div className="space-y-4">
            {schools.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <School className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无收藏的学校</p>
                  <Link href="/schools">
                    <Button variant="outline" className="mt-4">去学校列表</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              schools.map(school => (
                <Card key={school.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <Link href={`/schools/${school.id}`} className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{school.name}</CardTitle>
                          {school.rating && (
                            <div className="flex items-center text-sm text-yellow-600">
                              <Star className="w-4 h-4 fill-yellow-500" />
                              {school.rating.toFixed(1)}
                            </div>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            school.type === "小学" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                          }`}>
                            {school.type}
                          </span>
                          {school.level && <span className="text-xs">{school.level}</span>}
                          <span className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3" />
                            {school.district}
                          </span>
                        </CardDescription>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSchool(school.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Communities Tab */}
        {activeTab === "communities" && (
          <div className="space-y-4">
            {communities.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Home className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无收藏的小区</p>
                  <Link href="/communities">
                    <Button variant="outline" className="mt-4">去小区列表</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              communities.map(community => (
                <Card key={community.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <Link href={`/communities/${community.id}`} className="flex-1">
                        <CardTitle className="text-base">{community.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3" />
                            {community.district}
                          </span>
                          {community.avgPrice && (
                            <span className="text-green-600 font-medium text-sm ml-2">
                              {community.avgPrice.toLocaleString()}元/平
                            </span>
                          )}
                        </CardDescription>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCommunity(community.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Houses Tab */}
        {activeTab === "houses" && (
          <div className="space-y-4">
            {houses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Home className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无收藏的房源</p>
                  <Link href="/houses">
                    <Button variant="outline" className="mt-4">去房源列表</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              houses.map(house => (
                <Card key={house.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <Link href={`/houses/${house.id}`} className="flex-1">
                        <CardTitle className="text-base">{house.title}</CardTitle>
                        <CardDescription className="mt-1">
                          <span className="text-green-600 font-bold text-lg mr-3">
                            {house.price}万
                          </span>
                          <span className="text-gray-500 text-sm">
                            {house.unitPrice.toLocaleString()}元/平
                          </span>
                          <span className="mx-2">|</span>
                          <span className="text-sm">
                            {house.area.toFixed(1)}平 · {house.rooms}室{house.halls}厅
                          </span>
                        </CardDescription>
                        <div className="text-xs text-gray-400 mt-1">
                          {house.communityName}
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHouse(house.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
