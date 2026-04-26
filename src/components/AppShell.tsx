import { ReactNode, useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";

// Hook xử lý Parallax toàn cục
function useGlobalMouseParallax(intensity = 25) { 
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Đảm bảo không chạy trên mobile
    if (window.innerWidth < 768) return;

    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      // Sử dụng requestAnimationFrame để đảm bảo mượt mà 60fps và không block thread chính
      rafId = requestAnimationFrame(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Tính toán độ lệch (ngược hướng chuột để tạo chiều sâu)
        const moveX = -(e.clientX - centerX) / intensity;
        const moveY = -(e.clientY - centerY) / intensity;
        
        setOffset({ x: moveX, y: moveY });
      });
    };

    // Đăng ký sự kiện vào window ngay khi component mount
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [intensity]);

  return offset;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { x, y } = useGlobalMouseParallax(15); // Tăng độ nhạy (intensity thấp hơn = di chuyển nhiều hơn)

  // Đảm bảo lấy đúng background_url từ profile dù profile có thể đang load
  const rawUrl = profile ? (profile as any).background_url : null;
  const backgroundUrl = typeof rawUrl === 'string' && rawUrl.trim() !== "" ? rawUrl : null;
  const hasBackground = !!backgroundUrl;

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Lớp nền Parallax cố định cho toàn trang */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[#020205]">
        <div 
          key={backgroundUrl} // Buộc React tạo lại phần tử khi URL đổi, giúp trình duyệt nạp ảnh mới ngay lập tức
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
          style={{ 
            // Cấu trúc lớp: Lớp phủ tối -> Ảnh chính -> Lớp Gradient dự phòng
            backgroundColor: '#0a0b14',
            backgroundImage: hasBackground
              ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url("${backgroundUrl}"), radial-gradient(circle at 50% 0%, #1e2a4a 0%, #0a0b14 100%)`
              : `radial-gradient(circle at 50% 0%, #1e2a4a 0%, #0a0b14 100%)`,
            // Tăng scale lên 1.15 để tránh lộ viền khi di chuyển parallax mạnh
            transform: `translate3d(${x}px, ${y}px, 0) scale(1.15)`,
            // Sử dụng transition cực ngắn để phản hồi nhanh với chuột, tránh cảm giác bị trễ (lì)
            transition: 'transform 0.1s ease-out',
            willChange: 'transform',
          }}
        />
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
