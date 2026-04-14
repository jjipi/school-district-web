import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        district: true,
        latitude: true,
        longitude: true,
        rating: true,
        level: true,
      },
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
    })

    return NextResponse.json({ data: schools })
  } catch (error) {
    console.error("Failed to fetch schools:", error)
    return NextResponse.json({ error: "Failed to fetch schools" }, { status: 500 })
  }
}
