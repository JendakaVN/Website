import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet, Gamepad2, LogOut, User as UserIcon, Sparkles, Menu,
  Settings, History, ShoppingBag, Swords, Receipt, Shield, Coins
} from "lucide-react";
import { formatVND } from "@/data/discount";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const NAV = [
  { to: "/settings", label: "Cài đặt", icon: Settings },
  { to: "/recharge-history", label: "Lịch sử nạp", icon: History },
  { to: "/transactions", label: "Lịch sử giao dịch", icon: Receipt },
  { to: "/my-robux-orders", label: "Đơn Robux của bạn", icon: ShoppingBag },
  { to: "/my-boosting-orders", label: "Đơn cày của bạn", icon: Swords },
];

export function Header() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Thiết lập Realtime listener để tự động cập nhật số dư
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`public:profiles:id=eq.${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          // Khi có bất kỳ thay đổi nào ở hàng của user trong bảng profiles, gọi refreshProfile
          refreshProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshProfile]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Gamepad2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-display font-bold gradient-text whitespace-nowrap">Shop Jendaka</span>
            <Sparkles className="w-4 h-4 text-warning hidden sm:block animate-pulse" />
          </Link>

          {/* Desktop nav (next to logo) */}
          <nav className="hidden xl:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-smooth inline-flex items-center gap-1.5"
              >
                <n.icon className="w-3.5 h-3.5" /> {n.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-smooth inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
          </nav>

          {/* Mobile/Tablet hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="gradient-text font-display">Menu điều hướng</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-1">
                <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-smooth text-sm">
                  <Gamepad2 className="w-4 h-4" /> Trang chủ
                </Link>
                <div className="h-px bg-border my-2" />
                {NAV.map((n) => (
                  <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-smooth text-sm">
                    <n.icon className="w-4 h-4 text-primary" /> {n.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-warning/10 hover:bg-warning/20 transition-smooth text-sm font-bold text-warning">
                    <Shield className="w-4 h-4" /> Trang Admin
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/50">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{formatVND(profile?.balance ?? 0)}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-secondary/40 hover:bg-secondary border border-border/40 transition-smooth">
                    <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {(profile?.display_name ?? "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">{profile?.display_name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-xs text-muted-foreground">Đăng nhập:</div>
                    <div className="font-semibold truncate">{profile?.display_name}</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-warning">
                      <Coins className="w-3 h-3" />
                      {(profile as any)?.robux_balance || 0} Robux
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {NAV.map((n) => (
                    <DropdownMenuItem key={n.to} onClick={() => navigate(n.to)}>
                      <n.icon className="w-4 h-4 mr-2" /> {n.label}
                    </DropdownMenuItem>
                  ))}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="text-warning font-semibold">
                        <Shield className="w-4 h-4 mr-2" /> Trang Admin
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }}>
                    <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")} className="bg-gradient-primary hover:opacity-90 transition-smooth font-semibold">
              Đăng nhập
            </Button>
          )}
        </div>
      </div>

      {user && (
        <div className="sm:hidden container mx-auto px-4 pb-3 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/50 w-full">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Số dư: {formatVND(profile?.balance ?? 0)}</span>
          </div>
        </div>
      )}
    </header>
  );
}
