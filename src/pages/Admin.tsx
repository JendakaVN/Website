import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { formatVND } from "@/data/discount";
import { Shield, CheckCircle2, XCircle, Loader2, Eye, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  created_at: string;
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
  created_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [robux, setRobux] = useState<RobuxOrder[]>([]);
  const [boost, setBoost] = useState<BoostOrder[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [failTarget, setFailTarget] = useState<{ kind: "robux" | "boost"; id: string } | null>(null);
  const [reason, setReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadAllData = async () => {
    const [r, b] = await Promise.all([
      supabase.from("robux_orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("boosting_orders").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    const robuxList = (r.data as RobuxOrder[]) ?? [];
    const boostList = (b.data as BoostOrder[]) ?? [];
    setRobux(robuxList);
    setBoost(boostList);
    const uids = Array.from(new Set([...robuxList, ...boostList].map((x) => x.user_id)));
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,display_name").in("id", uids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.display_name; });
      setProfilesMap(map);
    }
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

  if (roleLoading) return <AppShell><div className="container py-10 text-center text-muted-foreground">Đang kiểm tra quyền...</div></AppShell>;

  const newRobux = robux.filter((o) => !o.seen_by_admin && o.status !== "completed" && o.status !== "failed").length;
  const newBoost = boost.filter((o) => !o.seen_by_admin && o.status !== "completed" && o.status !== "failed").length;

  const renderRobux = (o: RobuxOrder) => {
    const settled = o.status === "completed" || o.status === "failed";
    return (
      <div key={o.id} className={`glass-card p-4 ${!o.seen_by_admin && !settled ? "border-warning/60 bg-warning/5" : ""}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{o.package_robux.toLocaleString()} Robux</span>
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
              User: <span className="font-semibold text-foreground">{profilesMap[o.user_id] ?? o.user_id.slice(0, 8)}</span> · Roblox: {o.roblox_username}
            </div>
            <div className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString("vi-VN")}</div>
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
              User: <span className="font-semibold text-foreground">{profilesMap[o.user_id] ?? o.user_id.slice(0, 8)}</span>
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
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="boost" className="gap-2">
              Đơn cày {newBoost > 0 && <Badge className="bg-warning text-warning-foreground">{newBoost}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="robux" className="gap-2">
              Đơn Robux {newRobux > 0 && <Badge className="bg-warning text-warning-foreground">{newRobux}</Badge>}
            </TabsTrigger>
          </TabsList>

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
