import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Voice Inventory',
  description: 'AI-powered voice inventory management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
