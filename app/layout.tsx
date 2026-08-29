import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '예수사랑병원 RIS',
  description: '예수사랑병원 영상의학과 검사 및 장비 운영 대시보드',
  openGraph: {
    title: '예수사랑병원 RIS',
    description: 'Radiology Information System',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '예수사랑병원 RIS',
    description: 'Radiology Information System',
    images: ['/og.png'],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
