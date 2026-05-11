import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Wallet, Gamepad2, LogOut, Sparkles, Menu,
  Settings, History, ShoppingBag, Swords, Receipt, Shield, Coins, Home, Link2 as LinkIcon
} from "lucide-react";
import { formatVND } from "@/data/discount";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/recharge-history", label: "Nạp thẻ", icon: History },
  { to: "/my-robux-orders", label: "Đơn Robux", icon: ShoppingBag },
  { to: "/my-boosting-orders", label: "Đơn cày", icon: Swords },
  { to: "/transactions", label: "Lịch sử giao dịch", icon: Receipt },
  { to: "/partner-form", label: "Liên kết", icon: LinkIcon },
];

export function Header() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Tự động cập nhật số dư khi có thay đổi trong Database (Realtime)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`header-profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, 
        () => refreshProfile()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refreshProfile]);
  
  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/auth");
  }, [signOut, navigate]);

  const userInitial = useMemo(() => (profile?.display_name ?? "U").charAt(0).toUpperCase(), [profile?.display_name]);

  return (
    <div className="h-20 w-full flex items-center">
      <div className="max-w-7xl mx-auto w-full px-4 flex items-center justify-between gap-4">
        
        {/* LEFT: Logo & Desktop Nav */}
        <div className="flex items-center gap-4 lg:gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform border-2 border-white/10 bg-secondary">
              <img src="/favicon.webp" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:flex flex-col justify-center">
              <span className="text-[20.5px] font-display font-black uppercase tracking-tighter gradient-text block leading-none">JendakaVN</span>
              <span className="text-[12.5px] text-muted-foreground font-medium uppercase tracking-widest leading-none mt-0.5">Roblox Store</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {useMemo(() => NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "px-3 py-1.5 text-[13.5px] font-bold rounded-lg flex items-center gap-1.5 transition-all",
                  location.pathname === link.to 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                )}
              >
                <link.icon className="w-4.5 h-4.5" />
                {link.label}
              </Link>
            )), [location.pathname])}
          </nav>
        </div>

        {/* RIGHT: User Info & Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              {/* Balance Desktop */}
              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-1.5 text-[15px] font-bold text-foreground">
                  <Wallet className="w-4 h-4 text-primary" />
                  {formatVND(profile?.balance ?? 0)}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 p-1.5 pl-4 rounded-full border border-border/60 hover:bg-secondary/50 transition-all outline-none">
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-[15px] font-bold text-foreground truncate max-w-[120px]">
                        {profile?.display_name?.split(' ')[0]}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
                      {userInitial}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl shadow-xl border-border/40">
                  <DropdownMenuLabel className="pb-3">
                    <p className="text-xs text-muted-foreground font-medium">Tài khoản</p>
                    <p className="font-bold truncate">{profile?.display_name}</p>
                    <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-secondary/40">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Số dư:</span>
                      <span className="text-xs font-black text-primary">{formatVND(profile?.balance ?? 0)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between p-2 rounded-lg bg-secondary/40">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Robux:</span>
                      <span className="text-xs font-black text-warning">{(profile as any)?.robux_balance || 0} Robux</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {NAV_LINKS.map((link) => (
                    <DropdownMenuItem key={link.to} onClick={() => navigate(link.to)} className="cursor-pointer gap-2 py-2">
                      <link.icon className="w-4 h-4 text-muted-foreground" /> {link.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer gap-2 py-2">
                    <Settings className="w-4 h-4 text-muted-foreground" /> Cài đặt
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer gap-2 py-2 text-warning font-bold focus:text-warning">
                        <Shield className="w-4 h-4" /> Quản trị (Admin)
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer gap-2 py-2 text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4" /> Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")} size="sm" className="bg-gradient-primary shadow-lg font-bold px-5 h-9">
              Đăng nhập
            </Button>
          )}

          {/* Mobile Navigation Toggle */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-r-border/40">
              <SheetHeader className="p-6 border-b border-border/40 bg-secondary/20">
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-md bg-secondary">
                    <img src="/favicon.webp" alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-display font-bold text-lg tracking-tighter">Shop Jendaka</span>
                </SheetTitle>
              </SheetHeader>
              <div className="p-4 flex flex-col gap-1">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-[14.5px] font-semibold">
                  <Home className="w-4 h-4 text-muted-foreground" /> Trang chủ
                </Link>
                <div className="h-px bg-border/40 my-2" />
                {NAV_LINKS.map((link) => (
                  <Link 
                    key={link.to} 
                    to={link.to} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-[14.5px] font-semibold",
                      location.pathname === link.to ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                    )}
                  >
                    <link.icon className="w-4 h-4" /> {link.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-warning/10 text-warning transition-colors text-[14.5px] font-bold mt-2">
                    <Shield className="w-4 h-4" /> Quản trị Admin
                  </Link>
                )}
                {!user && (
                  <Button onClick={() => { setIsMobileMenuOpen(false); navigate("/auth"); }} className="mt-4 bg-gradient-primary font-bold">
                    Đăng nhập ngay
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
