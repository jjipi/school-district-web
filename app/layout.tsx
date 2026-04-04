import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "上海学区房查询",
  description: "帮助家长快速查询上海学校信息、学区划片、房源行情",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}