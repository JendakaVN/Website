import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  const bgStyle = (profile as any)?.background_url 
    ? { 
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${(profile as any).background_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } 
    : {};

  return (
    <div className="min-h-screen flex flex-col transition-all duration-700" style={bgStyle}>
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Shop Jendaka — Nạp thẻ & Robux uy tín. Mọi giao dịch tự động 24/7.
      </footer>
    </div>
  );
}
