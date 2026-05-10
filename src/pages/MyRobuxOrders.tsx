import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "./AppShell";
import { formatVND } from "@/data/discount";
import { ShoppingBag, CheckCircle2, XCircle, Loader2, Eye, Coins, ArrowRight, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Order {
  id: string;
  roblox_username: string;
  package_robux: number;
  price: number;
  status: string;
  seen_by_admin: boolean;
  failure_reason: string | null;
  created_at: string;
}

export default function MyRobuxOrders() {
  const { user, profile, loading: authLoading } = useAuth(); // Destructure authLoading
  const navigate = useNavigate();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const prev = useRef<Record<string, Order>>({});
  const firstLoad = useRef(true);

  useEffect(() => {
    if (authLoading) return; // Wait for authentication to complete
    if (!user) { navigate("/auth"); return; } // Navigate to auth if user is not logged in after authLoading is false

    const load = async () => {
      const { data } = await supabase
        .from("robux_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data as Order[]) ?? [];
      if (!firstLoad.current) {
        list.forEach((o) => {
          const old = prev.current[o.id];
          if (old) {
            if (!old.seen_by_admin && o.seen_by_admin && o.status !== "completed" && o.status !== "failed") {
              toast.info(`👀 Admin đã xem đơn ${o.package_robux.toLocaleString()} Robux của bạn`);
            }
            if (old.status !== "completed" && o.status === "completed") {
              toast.success(`✅ Nạp thành công ${o.package_robux.toLocaleString()} Robux!`);
            }
            if (old.status !== "failed" && o.status === "failed") {
              toast.error(`❌ Đơn ${o.package_robux.toLocaleString()} Robux thất bại — đã hoàn tiền`);
            }
          }
        });
      }
      list.forEach((o) => { prev.current[o.id] = o; });
      firstLoad.current = false;
      setItems(list);
      setLoading(false);
    };
    load();
    const ch = supabase.channel("my-robux")
      .on("postgres_changes", { event: "*", schema: "public", table: "robux_orders", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, navigate, authLoading]); // Add authLoading to dependencies

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Khu vực rút Robux nổi bật */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-warning/20 via-primary/10 to-transparent border-2 border-warning/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-warning/10 rounded-full blur-3xl group-hover:bg-warning/20 transition-all duration-500" />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow shrink-0">
                <Coins className="w-8 h-8 text-background animate-bounce" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-warning/80 mb-1 flex items-center gap-1">
                  <Gift className="w-3 h-3" /> Robux từ Giveaway
                </div>
                <div className="text-3xl font-display font-black text-foreground">
                  {(profile as any)?.robux_balance || 0} <span className="text-sm font-medium text-muted-foreground ml-1">Robux</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => navigate("/", { state: { withdrawMode: true } })}
              className="w-full sm:w-auto bg-gradient-gold text-background font-bold h-12 px-8 shadow-glow-gold hover:scale-105 transition-all"
            >
              RÚT ROBUX NGAY <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <ShoppingBag className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-display font-bold">Đơn Robux của bạn</h1>
        </div>

        {loading ? (
          <p className="text-center py-10 text-muted-foreground">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">Chưa có đơn nào.</p>
        ) : (
          <div className="space-y-2">
            {items.map((o) => {
              const Icon = o.status === "completed" ? CheckCircle2 : o.status === "failed" ? XCircle : Loader2;
              const cls = o.status === "completed" ? "text-success" : o.status === "failed" ? "text-destructive" : "text-warning animate-spin";
              return (
                <div key={o.id} className="glass-card p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 shrink-0 ${cls}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold">{o.package_robux.toLocaleString()} Robux</span>
                        <span className="font-bold text-primary">{formatVND(o.price)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{o.roblox_username}</div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant={o.seen_by_admin ? "default" : "outline"} className="text-[10px] gap-1">
                          <Eye className="w-3 h-3" />
                          {o.seen_by_admin ? "Admin đã xem" : "Chưa xem"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(o.created_at).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      {o.failure_reason && (
                        <div className="mt-2 text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded-md">
                          <strong>Lý do thất bại:</strong> {o.failure_reason} <em>(đã hoàn tiền)</em>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
