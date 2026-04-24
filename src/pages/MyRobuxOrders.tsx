import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { formatVND } from "@/data/discount";
import { ShoppingBag, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const prev = useRef<Record<string, Order>>({});
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
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
  }, [user, navigate]);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
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
                      <div className="text-xs text-muted-foreground truncate">@{o.roblox_username}</div>
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
