import type { Metadata } from 'next';
import './globals.css';
import OrderReminder from './order-reminder';
export const metadata: Metadata = {
  title: 'ATLAS Uniform Studio — criação e produção de uniformes',
  creator: 'Andrei Raimundi',
  authors: [{ name: 'Andrei Raimundi' }],
  description: 'Liberdade para criar. Poder para produzir. Crie uniformes em 3D, monte apresentações e conecte desenhos, listas e pedidos com o Atlas Uniform Studio.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=atlas-20261024', type: 'image/x-icon', sizes: '16x16 32x32 48x48 64x64' },
      { url: '/atlas-favicon-32.png?v=atlas-20261024', type: 'image/png', sizes: '32x32' },
      { url: '/atlas-favicon.svg?v=atlas-20261024', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/favicon.ico?v=atlas-20261024',
    apple: { url: '/apple-touch-icon.png?v=atlas-20261024', sizes: '180x180', type: 'image/png' },
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><head><link rel="stylesheet" href="/interface-theme.css?v=2"/><link rel="stylesheet" href="/studio-navigation.css?v=1"/><link rel="stylesheet" href="/atlas-brand.css?v=1"/><script src="/interface-theme.js?v=2"/></head><body>{children}<OrderReminder/></body></html>;
}
