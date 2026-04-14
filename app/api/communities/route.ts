import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const communities = await prisma.community.findMany({
      select: {
        id: true,
        name: true,
        district: true,
        latitude: true,
        longitude: true,
        avgPrice: true,
        address: true,
      },
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
    })

    return NextResponse.json({ data: communities })
  } catch (error) {
    console.error("Failed to fetch communities:", error)
    return NextResponse.json({ error: "Failed to fetch communities" }, { status: 500 })
  }
}
