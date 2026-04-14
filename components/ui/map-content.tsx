"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { School, Home, MapPin } from "lucide-react"

// Dynamically import Leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

interface School {
  id: string
  name: string
  type: string
  district: string
  latitude: number | null
  longitude: number | null
}

interface Community {
  id: string
  name: string
  district: string
  latitude: number | null
  longitude: number | null
  avgPrice: number | null
}

export default function MapContent() {
  const [schools, setSchools] = useState<School[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [filter, setFilter] = useState<"all" | "school" | "community">("all")
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all")
  const [districts, setDistricts] = useState<string[]>([])
  const [L, setL] = useState<any>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    // Dynamically import leaflet
    import("leaflet").then((leaflet) => {
      // Fix leaflet default marker icon issue in webpack
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      })
      setL(leaflet)
      setMapReady(true)
    })
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const [schoolsRes, communitiesRes] = await Promise.all([
          fetch("/api/schools").then(r => r.json()),
          fetch("/api/communities").then(r => r.json())
        ])
        
        if (schoolsRes.data) {
          const schoolsData = schoolsRes.data as School[]
          setSchools(schoolsData)
          const uniqueDistricts = [...new Set(schoolsData.map((s: School) => s.district))]
          setDistricts(uniqueDistricts.sort() as string[])
        }
        if (communitiesRes.data) {
          setCommunities(communitiesRes.data as Community[])
        }
      } catch (error) {
        console.error("Failed to fetch map data:", error)
      }
    }
    fetchData()
  }, [])

  const filteredSchools = schools.filter(s => {
    if (s.latitude === null || s.longitude === null) return false
    if (selectedDistrict !== "all" && s.district !== selectedDistrict) return false
    return true
  })

  const filteredCommunities = communities.filter(c => {
    if (c.latitude === null || c.longitude === null) return false
    if (selectedDistrict !== "all" && c.district !== selectedDistrict) return false
    return true
  })

  // Default center: Shanghai
  const defaultCenter: [number, number] = [31.2304, 121.4737]

  const schoolIcon = L ? new L.DivIcon({
    html: `<div style="background:#3b82f6;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">🏫</div>`,
    className: "school-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }) : null

  const communityIcon = L ? new L.DivIcon({
    html: `<div style="background:#22c55e;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">🏠</div>`,
    className: "community-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }) : null

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r overflow-y-auto p-4">
        <h1 className="text-xl font-bold mb-4">学区地图</h1>
        
        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">显示类型</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                >
                  全部
                </Button>
                <Button
                  size="sm"
                  variant={filter === "school" ? "default" : "outline"}
                  onClick={() => setFilter("school")}
                >
                  <School className="w-4 h-4 mr-1" />
                  学校
                </Button>
                <Button
                  size="sm"
                  variant={filter === "community" ? "default" : "outline"}
                  onClick={() => setFilter("community")}
                >
                  <Home className="w-4 h-4 mr-1" />
                  小区
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">区县筛选</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="all">全上海</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="text-sm text-gray-500 mb-4">
          共 {filter === "all" ? filteredSchools.length + filteredCommunities.length : filter === "school" ? filteredSchools.length : filteredCommunities.length} 个标记点
        </div>

        {/* School List */}
        {(filter === "all" || filter === "school") && filteredSchools.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <School className="w-4 h-4" /> 学校
            </h3>
            <div className="space-y-2">
              {filteredSchools.slice(0, 10).map(school => (
                <Card
                  key={school.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="font-medium text-sm">{school.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {school.district}
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {school.type}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredSchools.length > 10 && (
                <div className="text-xs text-gray-400 text-center">
                  还有 {filteredSchools.length - 10} 所学校...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Community List */}
        {(filter === "all" || filter === "community") && filteredCommunities.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Home className="w-4 h-4" /> 小区
            </h3>
            <div className="space-y-2">
              {filteredCommunities.slice(0, 10).map(community => (
                <Card
                  key={community.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="font-medium text-sm">{community.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {community.district}
                      {community.avgPrice && (
                        <span className="ml-2 text-green-600 font-medium">
                          {community.avgPrice.toLocaleString()}元/平
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredCommunities.length > 10 && (
                <div className="text-xs text-gray-400 text-center">
                  还有 {filteredCommunities.length - 10} 个小区...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {mapReady && L && (
          <MapContainer
            center={defaultCenter}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* School Markers */}
            {(filter === "all" || filter === "school") && filteredSchools.map(school => (
              schoolIcon && (
                <Marker
                  key={`school-${school.id}`}
                  position={[school.latitude!, school.longitude!]}
                  icon={schoolIcon}
                >
                  <Popup>
                    <div className="p-1">
                      <Link
                        href={`/schools/${school.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {school.name}
                      </Link>
                      <div className="text-sm text-gray-600 mt-1">
                        <div>{school.district}</div>
                        <div className="text-xs text-gray-400 mt-1">{school.type}</div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}

            {/* Community Markers */}
            {(filter === "all" || filter === "community") && filteredCommunities.map(community => (
              communityIcon && (
                <Marker
                  key={`community-${community.id}`}
                  position={[community.latitude!, community.longitude!]}
                  icon={communityIcon}
                >
                  <Popup>
                    <div className="p-1">
                      <Link
                        href={`/communities/${community.id}`}
                        className="font-medium text-green-600 hover:underline"
                      >
                        {community.name}
                      </Link>
                      <div className="text-sm text-gray-600 mt-1">
                        <div>{community.district}</div>
                        {community.avgPrice && (
                          <div className="text-green-600 font-medium mt-1">
                            {community.avgPrice.toLocaleString()}元/平
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  )
}
