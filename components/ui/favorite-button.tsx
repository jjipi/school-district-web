"use client"

import { useEffect, useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FavoriteButtonProps {
  type: "school" | "community" | "house"
  id: string
  name: string
  extra?: Record<string, any>
  variant?: "default" | "outline"
}

export function FavoriteButton({ type, id, name, extra = {}, variant = "outline" }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    checkFavorite()
  }, [id])

  function checkFavorite() {
    try {
      const stored = localStorage.getItem("favorites")
      if (stored) {
        const favorites = JSON.parse(stored)
        const items = favorites[type === "school" ? "schools" : type === "community" ? "communities" : "houses"] || []
        setIsFavorited(items.some((item: any) => item.id === id))
      }
    } catch (error) {
      console.error("Failed to check favorite:", error)
    }
  }

  function toggleFavorite() {
    try {
      const stored = localStorage.getItem("favorites")
      const favorites = stored ? JSON.parse(stored) : {
        schools: [],
        communities: [],
        houses: []
      }

      const key = type === "school" ? "schools" : type === "community" ? "communities" : "houses"
      const items = favorites[key] || []

      if (isFavorited) {
        // Remove
        favorites[key] = items.filter((item: any) => item.id !== id)
      } else {
        // Add
        items.push({ id, name, ...extra })
        favorites[key] = items
      }

      localStorage.setItem("favorites", JSON.stringify(favorites))
      setIsFavorited(!isFavorited)
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
    }
  }

  if (!isClient) {
    return (
      <Button variant={variant} size="sm" disabled>
        <Heart className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite()
      }}
      className={isFavorited ? "text-red-500 hover:text-red-700" : ""}
    >
      <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
      {isFavorited ? "已收藏" : "收藏"}
    </Button>
  )
}
