import type { ReactNode } from 'react';
import '../src/index.css';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:5173';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: '重返夜郎国',
  description: '沉浸式文化体验《重返夜郎国》',
  applicationName: '重返夜郎国',
  icons: { icon: '/assets/ui/logo.svg' },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: '重返夜郎国',
    description: '戴上傩面，在两日行程中探索、记录、抉择与守城。',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '重返夜郎国' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: '重返夜郎国',
    description: '沉浸式文化体验《重返夜郎国》',
    images: ['/og.png']
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0C1014'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
