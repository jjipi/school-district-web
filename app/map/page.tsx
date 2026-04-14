"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"

// Dynamically import MapContent with SSR disabled to avoid window issues with Leaflet
const MapContent = dynamic(
  () => import("@/components/ui/map-content").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="flex h-[calc(100vh-64px)] items-center justify-center text-gray-500">地图加载中...</div> }
)

export default function MapPage() {
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
            <Link href="/map" className="text-blue-600 font-medium">地图</Link>
            <Link href="/favorites" className="text-gray-600 hover:text-gray-900">收藏</Link>
            <Link href="/policy" className="text-gray-600 hover:text-gray-900">政策</Link>
          </nav>
        </div>
      </header>

      <MapContent />
    </div>
  )
}
