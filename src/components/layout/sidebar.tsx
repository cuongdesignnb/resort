'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Grid3X3, 
  CalendarDays, 
  FileSpreadsheet, 
  Moon, 
  Sun, 
  LogOut,
  ChevronDown,
  AlertTriangle,
  Hotel,
  CalendarCheck,
  CalendarX,
  DollarSign,
  Coffee,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(true);

  // Initialize theme from system preference or local storage
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark-mode') || 
                   localStorage.getItem('theme') === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Import Forecast', href: '/imports', icon: UploadCloud },
    { name: 'Forecast Grid', href: '/forecast', icon: Grid3X3 },
    { name: 'Bookings List', href: '/bookings', icon: CalendarDays },
  ];

  const reportItems = [
    { name: 'Khách Vào/Ra', href: '/reports/arrival-departure', icon: CalendarCheck },
    { name: 'Suất Ăn F&B', href: '/reports/meals', icon: Coffee },
    { name: 'Doanh Thu', href: '/reports/revenue', icon: DollarSign },
    { name: 'Phòng Trống/Trùng', href: '/reports/rooms', icon: Hotel },
    { name: 'Phòng Hủy', href: '/reports/cancellations', icon: CalendarX },
    { name: 'Chất Lượng Data', href: '/reports/data-quality', icon: AlertTriangle },
  ];

  return (
    <aside 
      className={cn(
        "h-screen fixed top-0 left-0 bg-[var(--bg-sidebar)] text-slate-100 flex flex-col justify-between transition-all duration-300 z-50 border-r border-slate-800",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div>
        {/* Logo / Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3 justify-between">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <Hotel className="h-6 w-6 text-amber-500 fill-amber-500/20" />
              <span className="font-outfit font-bold text-lg tracking-wide bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
                CUONG DESIGN
              </span>
            </Link>
          )}
          {collapsed && (
            <Hotel className="h-6 w-6 text-amber-500 mx-auto" />
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800/50 hidden md:block"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* Main Nav Items */}
        <nav className="mt-6 px-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/' && pathname === '/dashboard');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}

          {/* Collapsible Reports Group */}
          <div className="pt-4 border-t border-slate-800/60 mt-4">
            {!collapsed ? (
              <div>
                <button
                  onClick={() => setReportsOpen(!reportsOpen)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-slate-500 tracking-wider uppercase hover:text-slate-300"
                >
                  <span>Operations Reports</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", reportsOpen ? "rotate-180" : "")} />
                </button>
                {reportsOpen && (
                  <div className="mt-1 space-y-1 pl-2">
                    {reportItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                            isActive 
                              ? "bg-slate-800 text-white font-semibold" 
                              : "text-slate-400 hover:text-white hover:bg-slate-800/30"
                          )}
                        >
                          <item.icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300")} />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 pt-2">
                <Database className="h-4 w-4 text-slate-600 mb-1" />
                {reportItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        isActive ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white"
                      )}
                      title={item.name}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Footer Toggle */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-1.5">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 w-full transition-all cursor-pointer"
          title={collapsed ? "Toggle Theme" : undefined}
        >
          {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-400" />}
          {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 w-full transition-all cursor-pointer"
          title={collapsed ? "Đăng xuất" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>

        {!collapsed && (
          <div className="px-3 py-2 bg-slate-900/60 rounded-lg flex items-center gap-3 border border-slate-800/50 mt-1">
            <div className="h-8 w-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-xs shadow-inner">
              C
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">Cuong Admin</p>
              <p className="text-[10px] text-slate-500 truncate">Senior Operations</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
