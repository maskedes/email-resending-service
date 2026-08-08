'use client';

import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-ambient h-screen overflow-hidden bg-canvas flex">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto [direction:rtl]">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 [direction:ltr]">
          {children}
        </div>
      </main>
    </div>
  );
}