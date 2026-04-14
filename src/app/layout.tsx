import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'OpenClaw Dashboard',
  description: 'Dashboard for OpenClaw management and monitoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-gray-800">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">⚡</span>
                    </div>
                    <h1 className="text-xl font-bold">OpenClaw Dashboard</h1>
                  </div>
                  <nav className="flex items-center space-x-6">
                    <a href="/" className="text-gray-400 hover:text-white transition">
                      Контрольный центр
                    </a>
                    <a href="/memory" className="text-gray-400 hover:text-white transition">
                      Память
                    </a>
                    <a href="/tasks" className="text-gray-400 hover:text-white transition">
                      Задачи
                    </a>
                    <a href="/integrations" className="text-gray-400 hover:text-white transition">
                      Интеграции
                    </a>
                  </nav>
                </div>
              </div>
            </header>
            <main className="flex-1 container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-gray-800 py-4">
              <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                <p>OpenClaw Dashboard • Разработано с помощью Атласа • {new Date().getFullYear()}</p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}