import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";
import "./globals.css";

export const metadata = {
  title: "Strim - Your Favorite Dramas",
  description: "Stream the best asian dramas and unlimited entertainment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-background text-foreground pb-20 md:pb-0">
        <Navbar />
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
