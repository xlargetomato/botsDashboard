import { Geist, Geist_Mono } from "next/font/google";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { LanguageProvider } from "@/lib/i18n/config";
import { AuthProvider } from "@/lib/auth/AuthContext";
import DatabaseInitializer from "@/components/DatabaseInitializer";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: `${process.env.NEXT_PUBLIC_PROJECT_NAME} -  Dashboard`,
  description: " your sites with our powerful dashboard platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} font-sans antialiased`}
      >
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              <DatabaseInitializer />
              <Navbar />
              <div className="flex flex-col min-h-screen">
                {children}
              </div>
              <Footer />
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}