import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { formatVND } from "@/data/discount";
import { Shield, CheckCircle2, XCircle, Loader2, Eye, Bell, Gift, Users, DollarSign, Coins, Trophy, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface RobuxOrder {
  id: string;
  user_id: string;
  roblox_username: string;
  package_robux: number;
  price: number;
  status: string;
  seen_by_admin: boolean;
  failure_reason: string | null;
  roblox_id?: number;
  roblox_display_name?: string;
  roblox_avatar_url?: string;
  created_at: string;
  profiles?: { display_name: string };
}
interface BoostOrder {
  id: string;
  user_id: string;
  game: string;
  package: string;
  note: string | null;
  price: number;
  status: string;
  seen_by_admin: boolean;
  failure_reason: string | null;
  roblox_id?: number;
  roblox_display_name?: string;
  roblox_avatar_url?: string;
  created_at: string;
  profiles?: { display_name: string };
}

export default function AdminPage() {
  const { user, refreshProfile } = useAuth(); // Destructure refreshProfile
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [robux, setRobux] = useState<RobuxOrder[]>([]);
  const [boost, setBoost] = useState<BoostOrder[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; display_name: string; background_url?: string }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [vndPrize, setVndPrize] = useState(10000);
  const [robuxPrize, setRobuxPrize] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [giveawayAngle, setGiveawayAngle] = useState(0);
  const [winner, setWinner] = useState<{ id: string; display_name: string } | null>(null);

  const [failTarget, setFailTarget] = useState<{ kind: "robux" | "boost"; id: string } | null>(null);
  const [reason, setReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadAllData = async () => {
    const [r, b, u] = await Promise.all([
      supabase.from("robux_orders").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("boosting_orders").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, display_name, background_url").order("display_name", { ascending: true }).limit(200),
    ]);

    const sortFn = (a: any, b: any) => {
      const aSettled = a.status === "completed" || a.status === "failed";
      const bSettled = b.status === "completed" || b.status === "failed";

      // Đơn đã xong luôn ở dưới cùng
      if (aSettled && !bSettled) return 1;
      if (!aSettled && bSettled) return -1;

      // Nếu cả 2 đều chưa xong (settled): Ưu tiên đơn ĐÃ XEM (seen) lên TRÊN đơn CHƯA XEM
      if (!aSettled && !bSettled) {
        if (a.seen_by_admin && !b.seen_by_admin) return -1; // a lên trên
        if (!a.seen_by_admin && b.seen_by_admin) return 1;  // b lên trên
      }

      // Mặc định sắp xếp theo thời gian mới nhất
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };

    setRobux(((r.data as unknown as RobuxOrder[]) ?? []).sort(sortFn));
    setBoost(((b.data as unknown as BoostOrder[]) ?? []).sort(sortFn));
    setAllUsers(u.data ?? []);
  };

  const getDisplayName = (profiles: any) => {
    if (Array.isArray(profiles)) return profiles[0]?.display_name;
    return profiles.display_name;
  };

  useEffect(() => {
    if (!user || roleLoading) return;
    if (!isAdmin) { toast.error("Bạn không có quyền truy cập"); navigate("/"); return; }
    loadAllData();

    const ch1 = supabase.channel("admin-robux")
      .on("postgres_changes", { event: "*", schema: "public", table: "robux_orders" }, (p) => {
        if (p.eventType === "INSERT") {
          toast.info(`🔔 Đơn Robux mới từ ${(p.new as RobuxOrder).roblox_username}`);
        }
        loadAllData();
      })
      .subscribe();
    const ch2 = supabase.channel("admin-boost")
      .on("postgres_changes", { event: "*", schema: "public", table: "boosting_orders" }, (p) => {
        if (p.eventType === "INSERT") {
          toast.info(`🔔 Đơn cày mới: ${(p.new as BoostOrder).game}`);
        }
        loadAllData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [user, isAdmin, roleLoading, navigate]);

  const markSeen = async (kind: "robux" | "boost", id: string) => {
    // Cập nhật local state ngay lập tức để nút "Đã xem" biến mất và nút "Thành công" hiện lên ở trạng thái disabled
    if (kind === "robux") {
      setRobux(prev => prev.map(o => o.id === id ? { ...o, seen_by_admin: true } : o));
    } else {
      setBoost(prev => prev.map(o => o.id === id ? { ...o, seen_by_admin: true } : o));
    }
    
    setProcessingId(id);
    try {
      const fn = kind === "robux" ? "admin_mark_seen_robux" : "admin_mark_seen_boost";
      const { error } = await supabase.rpc(fn as any, { _id: id });
      if (error) toast.error(error.message);
      await loadAllData();
    } finally {
      setProcessingId(null);
    }
  };

  const complete = async (kind: "robux" | "boost", id: string) => {
    setProcessingId(id);
    try {
      const fn = kind === "robux" ? "admin_complete_robux_order" : "admin_complete_boost_order";
      const { error } = await supabase.rpc(fn as any, { _id: id });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Đã đánh dấu hoàn thành");
        await loadAllData();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const submitFail = async () => {
    if (!failTarget) return;
    if (!reason.trim()) return toast.error("Nhập lý do thất bại");
    const fn = failTarget.kind === "robux" ? "admin_fail_robux_order" : "admin_fail_boost_order";
    const { error } = await supabase.rpc(fn as any, { _id: failTarget.id, _reason: reason.trim() });
    if (error) return toast.error(error.message);
    toast.success("Đã đánh dấu thất bại + hoàn tiền cho user");
    setFailTarget(null);
    setReason("");
    await loadAllData();
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const startGiveaway = async () => {
    if (selectedUserIds.length < 1) return toast.error("Chọn ít nhất 1 người chơi");
    if (spinning) return;

    setSpinning(true);
    setWinner(null);

    const wheelElement = document.getElementById('giveaway-wheel');
    if (!wheelElement) return;

    const currentAngle = giveawayAngle; // Lấy góc quay hiện tại (đã cộng dồn)
    const currentPos = currentAngle % 360; // Vị trí hiện tại trong vòng tròn 360 độ
    const winnerIdx = Math.floor(Math.random() * selectedUserIds.length);
    const winnerId = selectedUserIds[winnerIdx];
    const winnerUser = allUsers.find(u => u.id === winnerId);

    const segAngle = 360 / selectedUserIds.length;
    const randomOffset = (Math.random() - 0.5) * (segAngle * 0.7);
    const targetPos = (90 - (winnerIdx * segAngle + segAngle / 2) + 360) % 360;
    
    const extraRounds = 8; // Tăng lên 8 vòng để quay lâu và đẹp hơn
    const delta = (targetPos - currentPos + 360) % 360;
    const totalAngle = currentAngle + (360 * extraRounds) + delta + randomOffset;

    // Sử dụng easing mượt mà, dừng tự nhiên không bị nẩy/giật ngược (tránh cảm giác ăn gian)
    const DURATION_MS = 4000; 
    wheelElement.style.transition = `transform ${DURATION_MS}ms cubic-bezier(0.1, 0, 0.2, 1)`;

    const onTransitionEnd = async () => {
      wheelElement.removeEventListener('transitionend', onTransitionEnd);
      if (winnerUser) {
        setWinner(winnerUser);
        try {
          const { error } = await supabase.rpc("process_giveaway_win" as any, {
            _winner_id: winnerUser.id,
            _vnd_amount: vndPrize,
            _robux_amount: robuxPrize
          });

          if (error) {
            toast.error("Lỗi cộng thưởng: " + error.message);
          } else {
            toast.success(`Chúc mừng ${winnerUser.display_name} đã thắng giveaway!`, {
              icon: <Trophy className="w-5 h-5 text-warning" />,
            });
            refreshProfile();
          }
        } catch (err: any) {
          toast.error(err.message);
        }
      }
      setSpinning(false);
    };

    wheelElement.addEventListener('transitionend', onTransitionEnd, { once: true });
    setGiveawayAngle(totalAngle);
    wheelElement.style.transform = `rotate(${totalAngle}deg)`;
  };


  if (roleLoading) return <AppShell><div className="container py-10 text-center text-muted-foreground">Đang kiểm tra quyền...</div></AppShell>;

  const newRobux = robux.filter((o) => !o.seen_by_admin && o.status !== "completed" && o.status !== "failed").length;
  const newBoost = boost.filter((o) => !o.seen_by_admin && o.status !== "completed" && o.status !== "failed").length;

  const renderRobux = (o: RobuxOrder) => {
    const settled = o.status === "completed" || o.status === "failed";
    return (
      <div key={o.id} className={`glass-card p-4 ${!o.seen_by_admin && !settled ? "border-warning/60 bg-warning/5" : ""}`}>
        <div className="flex items-start gap-3">
          {/* Avatar của người dùng */}
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary shrink-0 shadow-sm">
            {o.roblox_avatar_url ? (
              <img src={o.roblox_avatar_url} alt="RBLX" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">?</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-lg text-warning">{o.package_robux.toLocaleString()} Robux</span>
              {o.seen_by_admin && !settled && (
                <Badge className="bg-primary/15 text-primary border border-primary/30 gap-1">
                  <Eye className="w-3 h-3" /> Admin đã xem
                </Badge>
              )}
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{formatVND(o.price)}</span>
              {!o.seen_by_admin && !settled && <Badge className="bg-warning text-warning-foreground gap-1"><Bell className="w-3 h-3" />MỚI</Badge>}
              {o.status === "completed" && <Badge className="bg-success/15 text-success border border-success/40"><CheckCircle2 className="w-3 h-3 mr-1" />Thành công</Badge>}
              {o.status === "failed" && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Thất bại</Badge>}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              <div className="text-muted-foreground">Tên: <span className="text-foreground font-bold">{o.roblox_display_name || "N/A"}</span></div>
              <div className="text-muted-foreground">ID: <span className="text-foreground font-mono">{o.roblox_id || "N/A"}</span></div>
              <div className="text-muted-foreground">Username: <span className="text-primary font-medium">@{o.roblox_username.replace('@', '')}</span></div>
              <div className="text-muted-foreground">Khách: <span className="text-foreground">{getDisplayName(o.profiles) ?? "Ẩn danh"}</span></div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString("vi-VN")}</div>
            {o.failure_reason && <div className="text-xs text-destructive mt-1">Lý do: {o.failure_reason}</div>}
          </div>
          {!settled && (
            <div className="flex flex-col gap-1.5 shrink-0">
              {!o.seen_by_admin ? (
                <Button size="sm" variant="outline" onClick={() => markSeen("robux", o.id)} disabled={processingId === o.id}>
                  <Eye className={`w-3 h-3 mr-1 ${processingId === o.id ? "animate-pulse" : ""}`} /> Đã xem
                </Button>
              ) : (
                <Button size="sm" className="bg-success/15 text-success border border-success/40 hover:bg-success/25" onClick={() => complete("robux", o.id)} disabled={processingId === o.id}>
                  {processingId === o.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />} Thành công
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => setFailTarget({ kind: "robux", id: o.id })} disabled={processingId === o.id}>
                <XCircle className="w-3 h-3 mr-1" /> Thất bại
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBoost = (o: BoostOrder) => {
    const settled = o.status === "completed" || o.status === "failed";
    return (
      <div key={o.id} className={`glass-card p-4 ${!o.seen_by_admin && !settled ? "border-warning/60 bg-warning/5" : ""}`}>
        <div className="flex items-start gap-3">
          {/* Avatar của người dùng */}
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary shrink-0 shadow-sm">
            {o.roblox_avatar_url ? (
              <img src={o.roblox_avatar_url} alt="RBLX" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">?</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{o.game}</span>
              <span className="text-xs text-muted-foreground">· {o.package}</span>
              {o.seen_by_admin && !settled && (
                <Badge className="bg-primary/15 text-primary border border-primary/30 gap-1">
                  <Eye className="w-3 h-3" /> Admin đã xem
                </Badge>
              )}
              <span className="text-primary font-semibold">{formatVND(o.price)}</span>
              {!o.seen_by_admin && !settled && <Badge className="bg-warning text-warning-foreground gap-1"><Bell className="w-3 h-3" />MỚI</Badge>}
              {o.status === "completed" && <Badge className="bg-success/15 text-success border border-success/40"><CheckCircle2 className="w-3 h-3 mr-1" />Thành công</Badge>}
              {o.status === "failed" && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Thất bại</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              User: <span className="font-semibold text-foreground">{getDisplayName(o.profiles) ?? o.user_id.slice(0, 8)}</span>
            </div>
            {o.note && <div className="text-xs italic text-muted-foreground mt-1">"{o.note}"</div>}
            <div className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString("vi-VN")}</div>
            {o.failure_reason && <div className="text-xs text-destructive mt-1">Lý do: {o.failure_reason}</div>}
          </div>
          {!settled && (
            <div className="flex flex-col gap-1.5 shrink-0">
              {!o.seen_by_admin ? (
                <Button size="sm" variant="outline" onClick={() => markSeen("boost", o.id)} disabled={processingId === o.id}>
                  <Eye className={`w-3 h-3 mr-1 ${processingId === o.id ? "animate-pulse" : ""}`} /> Đã xem
                </Button>
              ) : (
                <Button size="sm" className="bg-success/15 text-success border border-success/40 hover:bg-success/25" onClick={() => complete("boost", o.id)} disabled={processingId === o.id}>
                  {processingId === o.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />} Thành công
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => setFailTarget({ kind: "boost", id: o.id })} disabled={processingId === o.id}>
                <XCircle className="w-3 h-3 mr-1" /> Thất bại
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-warning" />
          <h1 className="text-2xl font-display font-bold">Trang Admin</h1>
        </div>

        <Tabs defaultValue="boost" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="boost" className="gap-2">
              Đơn cày {newBoost > 0 && <Badge className="bg-warning text-warning-foreground">{newBoost}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="robux" className="gap-2">
              Đơn Robux {newRobux > 0 && <Badge className="bg-warning text-warning-foreground">{newRobux}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="giveaway" className="gap-2">
              <Gift className="w-4 h-4" /> Giveaway
            </TabsTrigger>
          </TabsList>

          <TabsContent value="giveaway" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Left Column: The Wheel */}
              <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
                <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 border border-warning/30 text-xs font-bold text-warning">
                  <Sparkles className="w-3.5 h-3.5" /> Lucky Wheel
                </div>

                <div className="relative w-72 h-72 sm:w-80 sm:h-80 mb-8">
                  {/* Outer ring */}
                  <div className="absolute inset-[-10px] rounded-full border-4 border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.2)]" />
                  
                  {/* The Wheel */}
                  <div
                    id="giveaway-wheel"
                    className="w-full h-full rounded-full border-4 border-primary shadow-glow relative overflow-hidden voices-none"
                    style={{
                      transform: `rotate(${giveawayAngle}deg)`,
                      background: selectedUserIds.length > 0
                        ? `conic-gradient(${selectedUserIds.map((id, i) => {
                            const colors = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#F97316"];
                            const color = colors[i % colors.length];
                            const start = (i * 360) / selectedUserIds.length;
                            const end = ((i + 1) * 360) / selectedUserIds.length;
                            return `${color} ${start}deg ${end}deg`;
                          }).join(", ")})`
                        : "hsl(var(--muted))"
                    }}
                  >
                    {selectedUserIds.length > 0 && selectedUserIds.map((id, i) => {
                      const user = allUsers.find(u => u.id === id);
                      const segAngle = 360 / selectedUserIds.length;
                      return (
                        <div
                          key={id}
                          className="absolute top-1/2 left-1/2 origin-left text-[9px] font-black text-white uppercase tracking-tighter"
                          style={{
                            transform: `rotate(${i * segAngle + segAngle / 2 - 90}deg) translateX(40px)`,
                            width: '100px',
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                          }}
                        >
                          {user?.display_name.split(' ')[0].slice(0, 8)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Center Hub */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background border-4 border-primary shadow-glow z-10 flex items-center justify-center">
                    <Gift className="w-4 h-4 text-primary" />
                  </div>
                  
                  {/* Pointer */}
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-20">
                    <ChevronRight className="w-10 h-10 text-warning drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] rotate-180" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Thưởng VNĐ
                    </Label>
                    <Input type="number" min={0} value={vndPrize} onChange={e => setVndPrize(Math.max(0, Number(e.target.value)))} className="h-9 bg-secondary/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Coins className="w-3 h-3 text-warning" /> Thưởng Robux
                    </Label>
                    <Input type="number" min={0} value={robuxPrize} onChange={e => setRobuxPrize(Math.max(0, Number(e.target.value)))} className="h-9 text-warning font-bold bg-secondary/30" />
                  </div>
                </div>

                <Button
                  onClick={startGiveaway}
                  disabled={spinning || selectedUserIds.length < 1}
                  className="w-full max-w-sm bg-gradient-primary shadow-glow h-12 font-bold text-lg transition-bounce"
                >
                  {spinning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                  QUAY NGAY
                </Button>

                {/* Winner Display Section */}
                {winner && !spinning && (
                  <div className="mt-6 w-full max-w-sm p-4 rounded-2xl bg-success/10 border-2 border-success/30 text-center animate-in fade-in zoom-in duration-500 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-success text-white text-[10px] font-bold uppercase tracking-widest">
                      Người thắng cuộc
                    </div>
                    <Trophy className="w-8 h-8 text-warning mx-auto mb-2" />
                    <div className="text-xl font-display font-bold text-success mb-1">{winner.display_name}</div>
                    <div className="text-sm font-semibold text-warning">
                      +{formatVND(vndPrize)} & {robuxPrize.toLocaleString()} Robux
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: User Selection */}
              <div className="glass-card p-6 flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-bold">Chọn người tham gia ({selectedUserIds.length})</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUserIds([])} className="text-[10px] uppercase">Bỏ chọn hết</Button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                  {allUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all ${selectedUserIds.includes(u.id) ? "bg-primary/10 border-primary/40 shadow-sm" : "bg-secondary/20 border-transparent hover:border-border"}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden border border-border/50 shrink-0">
                          {(u as any).background_url ? (
                             <img src={(u as any).background_url} alt="AV" className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-[10px] font-bold uppercase">
                               {u.display_name.charAt(0)}
                             </div>
                          )}
                        </div>
                        <span className={`text-sm font-medium truncate max-w-[140px] ${selectedUserIds.includes(u.id) ? "text-primary" : "text-foreground/80"}`}>
                          {u.display_name}
                        </span>
                      </div>
                      {selectedUserIds.includes(u.id) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="boost" className="mt-4 space-y-2">
            {boost.length === 0 ? <p className="text-center py-10 text-muted-foreground">Chưa có đơn cày.</p> : boost.map(renderBoost)}
          </TabsContent>
          <TabsContent value="robux" className="mt-4 space-y-2">
            {robux.length === 0 ? <p className="text-center py-10 text-muted-foreground">Chưa có đơn Robux.</p> : robux.map(renderRobux)}
          </TabsContent>
        </Tabs>

        <Dialog open={!!failTarget} onOpenChange={(o) => { if (!o) { setFailTarget(null); setReason(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Đánh dấu đơn thất bại</DialogTitle>
              <DialogDescription>Tiền sẽ được hoàn 100% cho user và lý do được hiển thị cho họ.</DialogDescription>
            </DialogHeader>
            <div>
              <Label>Lý do thất bại</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Sai username, hết hàng..." rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFailTarget(null)}>Hủy</Button>
              <Button variant="destructive" onClick={submitFail}>Xác nhận thất bại + hoàn tiền</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
