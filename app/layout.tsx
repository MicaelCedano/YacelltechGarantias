import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "YacellTech | Control de Garantías",
  description: "Terminal de ingreso y panel de control de garantías de dispositivos móviles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${sora.variable} ${jetbrainsMono.variable} font-sans-sora antialiased bg-[#0f0f0f] text-[#f3f4f6] min-h-screen`}
      >
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#151515",
              color: "#f3f4f6",
              border: "1px solid #262626",
              borderRadius: "0px",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.875rem",
            },
            success: {
              iconTheme: {
                primary: "#F59E0B",
                secondary: "#151515",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
