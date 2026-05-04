import { ReactNode, useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";

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

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { isLowPower } = useGlobalMouseParallax(15); 

  // Đảm bảo lấy đúng background_url từ profile dù profile có thể đang load
  const rawUrl = profile ? (profile as any).background_url : null;
  // Security: Sanitize URL to prevent CSS injection (escaping quotes)
  const backgroundUrl = typeof rawUrl === 'string' && rawUrl.trim() !== "" 
    ? rawUrl.replace(/"/g, '%22').replace(/'/g, '%27')
    : null;
  const hasBackground = !!backgroundUrl;

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Lớp nền Parallax cố định cho toàn trang */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[#0a0b14]">
        {/* Lớp Gradient tĩnh (Không di chuyển để giảm tải GPU) */}
        <div 
          className="absolute inset-0 z-0 opacity-60"
          style={{ 
            backgroundImage: `radial-gradient(circle at 50% 0%, #1e2a4a 0%, #0a0b14 100%)`
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
          <div className="absolute inset-0 bg-black/60" />
        </div>
      </div>

      <Header />
      {/* pt-[96.5px] đẩy nội dung mobile xuống thêm đúng 0.5px so với mức 96px hiện tại */}
      <main className="flex-1 pt-[96.5px] sm:pt-16 relative z-10">
        {children}
      </main>
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Shop Jendaka — Nạp thẻ & Robux uy tín. Mọi giao dịch tự động 24/7.
      </footer>
    </div>
  );
}
