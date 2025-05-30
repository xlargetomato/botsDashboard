'use client';

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
        <Navbar isStatic={true} />
      <main className="flex-grow">
        {children}
      </main>
      {/* <Footer /> */}
    </div>
  );
}
// 