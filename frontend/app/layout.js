import { Geist } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "SafeSpot Toronto",
  description: "Real-time heat risk mapping and cooling centre routing for Toronto",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body className="bg-black text-white"><SmoothScroll>{children}</SmoothScroll></body>
    </html>
  );
}
