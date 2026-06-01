import type { Metadata } from 'next';
import Sidebar from '@/components/layout/sidebar';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cuong Design - Resort Forecast & Booking Analyzer',
  description: 'Premium operations internal tool for resort forecast reading, booking parsing, dining schedules, and occupancy analytics.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('auth_session')?.value;
  const session = sessionToken ? decryptSession(sessionToken) : null;

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="bg-[var(--bg-app)] min-h-screen text-[var(--foreground)] antialiased transition-colors duration-200" suppressHydrationWarning>
        {session ? (
          <div className="flex min-h-screen">
            {/* Navigation Sidebar */}
            <Sidebar />
            
            {/* Main Scrollable View */}
            <main className="flex-1 min-h-screen pl-20 md:pl-64 transition-all duration-300">
              <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>
          </div>
        ) : (
          <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-app)]">
            {children}
          </div>
        )}
      </body>
    </html>
  );
}
