import { useState, useEffect } from "react";
import { z } from "zod";
import { formatVND } from "@/data/discount";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { Coins, Sparkles, Lock, Search, Loader2, CheckCircle2, ChevronDown } from "lucide-react";

interface OfficialPackage {
  robux: number;
  priceVnd: number;
  badge?: string;
}

interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
  avatarUrl?: string | null;
}

const OFFICIAL_PACKAGES: OfficialPackage[] = [
  { robux: 40, priceVnd: 20000 },
  { robux: 55, priceVnd: 25000 },
  { robux: 80, priceVnd: 30000 },
  { robux: 145, priceVnd: 55000, badge: "Phổ biến" },
  { robux: 300, priceVnd: 100000, badge: "HOT" },
  { robux: 500, priceVnd: 150000 },
  { robux: 1000, priceVnd: 290000},
  { robux: 2000, priceVnd: 570000},
  { robux: 5250, priceVnd: 1410000 },
  { robux: 11000, priceVnd: 2810000 },
  { robux: 24000, priceVnd: 5610000 },
];

const userSchema = z
  .string()
  .trim()
  .min(4, "Tối thiểu 4 ký tự (gồm @ và ít nhất 3 ký tự)")
  .max(21, "Tối đa 21 ký tự (gồm @ và tối đa 20 ký tự)")
  .regex(/^@[A-Za-z0-9_]+$/, "Phải bắt đầu bằng @, theo sau là chữ, số hoặc _");

export function RobuxShop() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [picked, setPicked] = useState<OfficialPackage>(OFFICIAL_PACKAGES[5]); // Chọn gói 500 Robux làm mặc định
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RobloxUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<RobloxUser | null>(null);
  const [withdrawMode, setWithdrawMode] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);

  useEffect(() => {
    // Kiểm tra nếu có yêu cầu rút từ trang đơn hàng
    if (location.state?.withdrawMode) {
      setWithdrawMode(true);
      const element = document.getElementById("robux");
      if (element) {
        setTimeout(() => element.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [location]);

  const searchRobloxUser = async () => {
    // Đảm bảo loại bỏ dấu @ ở đầu trước khi đưa vào keyword như link bạn cung cấp
    const cleanName = username.startsWith("@") ? username.slice(1).trim() : username.trim();
    if (cleanName.length < 3) {
      toast.error("Vui lòng nhập ít nhất 3 ký tự để tìm kiếm");
      return;
    }

    setSearching(true);
    setSearchResults([]);
    setSelectedUser(null);

    try {
      // Gọi qua Supabase Edge Function để tránh lỗi CORS
      const res = await fetch(`https://psqqratdhxijxpdozltf.supabase.co/functions/v1/search-roblox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: cleanName }),
      });

      const searchData = await res.json();
      
      if (!res.ok) {
        throw new Error(searchData.error || "Không thể tìm kiếm tài khoản này");
      }

      if (searchData.data && searchData.data.length > 0) {
        const formattedUsers = searchData.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        }));

        setSearchResults(formattedUsers);
        if (formattedUsers.length === 0) toast.error("Không tìm thấy người dùng này");
      } else {
        toast.error("Không tìm thấy người dùng nào khớp");
      }
    } catch (error) {
      console.error("Lỗi tìm kiếm Roblox:", error);
      toast.error(error instanceof Error ? error.message : "Lỗi kết nối máy chủ tìm kiếm");
    } finally {
      setSearching(false);
    }
  };

  const buy = async () => {
    if (!user) { navigate("/auth"); return; }
    
    const targetName = selectedUser ? `@${selectedUser.name}` : username;
    const parsed = userSchema.safeParse(targetName);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    
    if (!selectedUser) { toast.error("Vui lòng tìm kiếm và chọn đúng tài khoản Roblox!"); return; }

    if (withdrawMode) {
      if (withdrawAmount <= 0) { toast.error("Vui lòng nhập số Robux muốn rút"); return; }
      const currentBal = (profile as any)?.robux_balance || 0;
      if (withdrawAmount > currentBal) { toast.error("Số dư Robux không đủ!"); return; }

      setBusy(true);
      try {
        // Thực hiện trừ robux_balance qua RPC
        const { error: rpc } = await supabase.rpc("withdraw_robux_balance" as any, {
          _amount: withdrawAmount,
          _description: `Rút ${withdrawAmount} Robux về tài khoản ${targetName}`
        });
        if (rpc) throw rpc;

        const { error } = await supabase.from("robux_orders").insert(({
          user_id: user.id,
          roblox_username: selectedUser.name,
          roblox_id: selectedUser.id,
          roblox_display_name: selectedUser.displayName,
          roblox_avatar_url: selectedUser.avatarUrl,
          package_robux: withdrawAmount,
          price: 0, // Rút tiền thì giá VNĐ bằng 0
          status: "processing",
        } as any));
        if (error) throw error;

        toast.success(`Đã yêu cầu rút ${withdrawAmount} Robux thành công!`);
        setWithdrawAmount(0);
        await refreshProfile();
      } catch (e: any) {
        toast.error(e.message ?? "Lỗi khi rút Robux");
      } finally {
        setBusy(false);
      }
      return;
    }

    if ((profile?.balance ?? 0) < picked.priceVnd) { toast.error("Số dư không đủ. Hãy nạp thẻ trước!"); return; }
    setBusy(true);
    try {
      const { error: rpc } = await supabase.rpc("adjust_balance", {
        _delta: -picked.priceVnd,
        _type: "robux_purchase",
        _description: `Mua ${picked.robux} Robux (chính hãng) cho ${parsed.data}`,
      });
      if (rpc) throw rpc;
      const { error } = await supabase.from("robux_orders").insert(({
        user_id: user.id,
        roblox_username: selectedUser.name,
        roblox_id: selectedUser.id,
        roblox_display_name: selectedUser.displayName,
        roblox_avatar_url: selectedUser.avatarUrl,
        package_robux: picked.robux,
        price: picked.priceVnd,
        status: "processing",
      } as any));
      if (error) throw error;
      toast.success(`Đã đặt ${picked.robux} Robux cho ${parsed.data}!`);
      await refreshProfile();
    } catch (e: any) {
      toast.error(e.message ?? "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="robux" className="container mx-auto px-4 py-10 sm:py-14">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-4xl font-display font-bold mb-2">Mua <span className="gradient-text">Robux</span></h2>
        <p className="text-muted-foreground text-sm sm:text-base">Nhận Robux trong vòng 24 giờ sau khi đặt.</p>
      </div>

      <div className="glass-card p-5 sm:p-8 max-w-5xl mx-auto">
        <Tabs defaultValue="official" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="official">Robux chính hãng</TabsTrigger>
            <TabsTrigger value="lau">Robux 120h</TabsTrigger>
          </TabsList>

          <TabsContent value="official" className="mt-0">
            <div className="mb-6">
              {selectedUser ? ( // If a user is selected, show their info and the "Change Account" button
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30 mb-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xs font-bold overflow-hidden border border-border/50 shrink-0">
                      {selectedUser.avatarUrl ? (
                        <img src={selectedUser.avatarUrl} alt={selectedUser.displayName} className="w-full h-full object-cover" />
                      ) : (
                        selectedUser.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{selectedUser.displayName}</div>
                      <div className="text-xs text-muted-foreground">@{selectedUser.name} (ID: {selectedUser.id})</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(null); // Clear selected user
                      setUsername(""); // Clear username input
                      setSearchResults([]); // Clear search results
                    }}
                    className="shrink-0"
                  >
                    Đổi tài khoản
                  </Button>
                </div>
              ) : ( // Otherwise, show the username input and search functionality
                <>
                  <Label htmlFor="rblxuser">Tên đăng nhập Roblox</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="rblxuser"
                        value={username}
                        onChange={(e) => {
                          let val = e.target.value;
                          val = val.replace(/[^A-Za-z0-9_@]/g, '');
                          const clean = val.replace(/@/g, '');
                          if (clean.length > 0) {
                            val = '@' + clean;
                          } else {
                            val = val.includes('@') ? '@' : '';
                          }
                          setUsername(val.slice(0, 21));
                          // No need to clear selectedUser here, as this block only renders when selectedUser is null
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") searchRobloxUser();
                        }}
                        placeholder="VD: @cnvksg"
                        maxLength={21}
                        // No need for className or disabled props here, as selectedUser is null
                      />
                      {/* CheckCircle2 is not needed here as it indicates a selected user, which would hide this input */}
                    </div>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={searchRobloxUser}
                      disabled={searching} // Only disable if currently searching
                    >
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span className="ml-2 hidden sm:inline">Tìm</span>
                    </Button>
                  </div>

                  {/* Danh sách kết quả tìm kiếm vẫn hiển thị khi chưa chọn tài khoản */}
                  {searchResults.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2 p-2 rounded-lg bg-secondary/20 border border-border/50">
                      <p className="text-[10px] text-primary/70 uppercase font-black px-2 tracking-wider">Kết quả tìm kiếm:</p>
                      {searchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u); // Select the user
                            setUsername(`@${u.name}`); // Update username state (this input will be hidden, but state is kept)
                            setSearchResults([]); // Clear search results
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-md transition-all text-left border ${
                            selectedUser?.id === u.id ? "bg-primary/20 border-primary/30" : "hover:bg-secondary/40"
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xs font-bold overflow-hidden border border-border/50 shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">{u.displayName}</div>
                            <div className="text-[11px] text-muted-foreground truncate">@{u.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {withdrawMode ? (
              <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-3">
                  <Label className="font-bold text-warning flex items-center gap-2">
                    <Coins className="w-4 h-4" /> Số lượng Robux muốn rút
                  </Label>
                  <Button variant="ghost" size="sm" onClick={() => setWithdrawMode(false)} className="h-7 px-2 text-[10px] uppercase font-bold text-primary">
                    Đổi sang Mua gói
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={withdrawAmount || ""}
                    onChange={(e) => setWithdrawAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-14 text-xl font-display font-black text-warning border-warning/30 bg-black focus-visible:ring-warning pr-20"
                    placeholder="VD: 500"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-warning/50">Robux</div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Số dư hiện tại: <span className="text-warning font-bold">{(profile as any)?.robux_balance || 0} Robux</span>
                </p>
              </div>
            ) : (
              <>
                <Label className="mb-3 block">Chọn gói</Label>

                {/* Mobile Selector Trigger (Hiện trên Mobile, ẩn trên Desktop) */}
                <div className="sm:hidden mb-6">
                  <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
                    <DialogTrigger asChild>
                      <button className="w-full p-4 rounded-xl text-left border-2 border-primary bg-secondary/40 flex items-center justify-between group transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Coins className="w-6 h-6 text-warning" />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Gói đang chọn</div>
                            <div className="font-display font-bold text-lg leading-none">
                              {picked.robux.toLocaleString()} Robux
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">{formatVND(picked.priceVnd)}</span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl overflow-hidden p-0 gap-0">
                      <DialogHeader className="p-4 border-b bg-secondary/10">
                        <DialogTitle>Chọn gói Robux</DialogTitle>
                      </DialogHeader>
                      <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 gap-1.5">
                          {OFFICIAL_PACKAGES.map((p) => (
                            <button
                              key={p.robux}
                              onClick={() => {
                                setPicked(p);
                                setPackageDialogOpen(false);
                              }}
                              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                picked.robux === p.robux
                                  ? "border-primary bg-primary/5"
                                  : "border-transparent bg-secondary/20 hover:bg-secondary/40 hover:border-border"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Coins className={`w-5 h-5 ${picked.robux === p.robux ? "text-primary" : "text-warning"}`} />
                                <div className="text-left">
                                  <div className="font-bold text-sm">Gói {p.robux.toLocaleString()} Robux</div>
                                  <div className="text-[10px] text-muted-foreground">{formatVND(p.priceVnd)}</div>
                                </div>
                              </div>
                              {picked.robux === p.robux && <CheckCircle2 className="w-4 h-4 text-primary" />}
                              {p.badge && !(picked.robux === p.robux) && (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-gradient-gold text-background uppercase">
                                  {p.badge}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Desktop Grid (Ẩn trên Mobile, hiện từ sm trở lên) */}
                <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  {OFFICIAL_PACKAGES.map((p) => (
                    <button
                      key={p.robux}
                      onClick={() => setPicked(p)}
                      className={`relative p-4 rounded-xl text-center transition-bounce border-2 ${
                        picked.robux === p.robux
                          ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                          : "border-border bg-secondary/40 hover:border-primary/50"
                      }`}
                    >
                      {p.badge && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-gold text-background">
                          {p.badge}
                        </span>
                      )}
                      <Coins className={`w-6 h-6 mx-auto mb-1 ${picked.robux === p.robux ? "text-primary-foreground" : "text-warning"}`} />
                      <div className="font-display font-bold text-lg">Gói {p.robux.toLocaleString()} Robux</div>
                      <div className="font-semibold mt-1 text-sm">{formatVND(p.priceVnd)}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            <Button 
              onClick={buy} 
              disabled={busy} 
              className={`w-full hover:opacity-90 transition-smooth shadow-glow h-12 font-bold text-lg ${withdrawMode ? "bg-gradient-gold text-background shadow-gold" : "bg-gradient-primary"}`}
            >
              {withdrawMode ? <Coins className="w-5 h-5 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {busy ? "Đang xử lý..." : !user ? "Đăng nhập để tiếp tục" : withdrawMode ? `RÚT NGAY ${withdrawAmount.toLocaleString()} ROBUX` : `Đặt mua ${picked.robux} Robux — ${formatVND(picked.priceVnd)}`}
            </Button>
          </TabsContent>

          <TabsContent value="lau" className="mt-0">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">Hiện chưa có</h3>
              <p className="text-muted-foreground text-sm">Mục Robux 120h đang được cập nhật. Vui lòng quay lại sau.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
