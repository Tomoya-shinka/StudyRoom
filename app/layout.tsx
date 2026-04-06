import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StudyRoom - 作業通話',
  description: '勉強・仕事に集中するための作業通話アプリ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-bg-base text-white antialiased">{children}</body>
    </html>
  )
}
