import { ReactNode, useState, useEffect, useMemo } from "react";
import { Header } from "./Header";
import { useAuth } from "@/context/AuthContext";
import { Moon, Sun } from "lucide-react";
import { TransactionTicker } from "./TransactionTicker";

// Hook xử lý Parallax toàn cục
function useGlobalMouseParallax(intensity = 25) { 
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    // Kiểm tra xem người dùng có muốn giảm chuyển động không hoặc đang trên mobile
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (prefersReducedMotion || isMobile) {
      setIsLowPower(true);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Sử dụng CSS Variables để tránh React re-render, giảm TBT đáng kể
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const moveX = -(e.clientX - centerX) / intensity;
      const moveY = -(e.clientY - centerY) / intensity;
      
      document.documentElement.style.setProperty('--parallax-x', `${moveX}px`);
      document.documentElement.style.setProperty('--parallax-y', `${moveY}px`);
    };

    // Đăng ký sự kiện vào window ngay khi component mount
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [intensity]);

  return { isLowPower };
}

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  const { profile } = useAuth();
  const { isLowPower } = useGlobalMouseParallax(15); 
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Khởi tạo theme từ localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light';
    setTheme(saved || 'light');
  }, []);

  // Cập nhật class vào thẻ html để Tailwind/CSS nhận diện
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Đảm bảo lấy đúng background_url từ profile dù profile có thể đang load
  const rawUrl = profile ? (profile as any).background_url : null;
  // Security: Sanitize URL to prevent CSS injection (escaping quotes)
  let backgroundUrl = typeof rawUrl === 'string' && rawUrl.trim() !== "" 
    ? rawUrl.replace(/"/g, '%22').replace(/'/g, '%27')
    : null;

  // Thiết lập hình nền mặc định cho Theme Light nếu người dùng chưa tự đổi
  if (!backgroundUrl && theme === 'light') {
    backgroundUrl = "https://haycafe.vn/wp-content/uploads/2021/12/Hinh-nen-mau-trang-dep.jpeg";
  }

  const hasBackground = !!backgroundUrl;

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Nút chuyển đổi giao diện cố định */}
      <button 
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        className="fixed bottom-6 right-6 z-[100] w-12 h-12 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-xl border border-border shadow-2xl hover:scale-110 active:scale-95 transition-all group ring-1 ring-border/50"
        title={theme === 'dark' ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      >
        {theme === 'dark' ? (
          <Moon className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform" />
        ) : (
          <Sun className="w-4 h-4 text-warning group-hover:rotate-45 transition-transform" />
        )}
      </button>

      {/* CSS Override cho Light Mode - Giúp load nhanh và màu sắc dịu nhẹ */}
      <style>{`
        :root.light {
          --background: 210 40% 98.5%; /* Slate 50 pha chút xanh dịu */
          --foreground: 222 47% 5%; /* Làm đậm chữ chính để tăng độ sắc nét */
          --card: 210 40% 99%;
          --card-foreground: 222 47% 5%;
          --popover: 0 0% 100%;
          --popover-foreground: 222 47% 5%;
          --primary: 262 83% 58%;
          --primary-foreground: 210 40% 98%;
          --secondary: 210 40% 96.1%;
          --secondary-foreground: 222.2 47.4% 11.2%;
          --muted: 210 40% 96.1%;
          --muted-foreground: 220 15% 35%; /* Tăng độ tương phản cho các đoạn mô tả phụ */
          --accent: 210 40% 96.1%;
          --accent-foreground: 222.2 47.4% 11.2%;
          --border: 214.3 31.8% 91.4%;
          --input: 214.3 31.8% 91.4%;
          --ring: 262 83% 58%;
        }
        .light .glass-card {
          background: rgba(255, 255, 255, 0.85); /* Tăng độ đục để text nổi bật hơn trên nền sáng */
          border-color: rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.04);
        }
        .light .ticker-card-bg {
          background: rgba(241, 245, 249, 0.8);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
      `}</style>

      {/* Lớp nền Parallax cố định cho toàn trang */}
      <div className={`fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0b14]' : 'bg-[#f8fafc]'}`}>
        {/* Lớp Gradient tĩnh (Không di chuyển để giảm tải GPU) */}
        <div 
          className="absolute inset-0 z-0 opacity-60"
          style={{ 
            backgroundImage: theme === 'dark' 
              ? `radial-gradient(circle at 50% 0%, #1e2a4a 0%, #0a0b14 100%)`
              : `radial-gradient(circle at 50% 0%, #e2e8f0 0%, #f8fafc 100%)`
          }} 
        />
        
        {/* Lớp Ảnh nền hoặc Video nền */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${hasBackground ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            transform: isLowPower ? 'none' : `translate3d(var(--parallax-x, 0), var(--parallax-y, 0), 0) scale(1.1)`,
            transition: isLowPower ? 'none' : 'transform 0.15s ease-out',
            willChange: 'transform',
          }}
        >
          {hasBackground && (
            <div 
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${backgroundUrl}")` }}
            />
          )}
          <div className={`absolute inset-0 transition-colors duration-500 ${theme === 'dark' ? 'bg-black/60' : 'bg-white/40'}`} />
        </div>
      </div>

      {/* Unified Header & Ticker Block - Hợp nhất khung để tránh lỗi tràn icon/chữ */}
      {!hideNav && (
        <header className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md bg-background/80 border-b border-border/40 shadow-sm transition-all duration-300">
          <TransactionTicker />
          <Header />
        </header>
      )}

      <main className={`flex-1 relative z-10 ${!hideNav ? "pt-32" : ""}`}>
        {children}
      </main>
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Shop Jendaka — Nạp thẻ & Robux uy tín. Mọi giao dịch tự động 24/7.
      </footer>
    </div>
  );
}
