import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/data/discount";
import { ShoppingBag, CheckCircle2, Loader2, XCircle } from "lucide-react";

interface Order {
  id: string;
  roblox_username: string;
  package_robux: number;
  price: number;
  status: string;
  created_at: string;
}

export function RobuxOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("robux_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      setOrders((data as Order[]) ?? []);
    };
    load();
    const ch = supabase.channel("orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "robux_orders", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!user) return null;

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="w-5 h-5 text-accent" />
        <h3 className="font-display font-bold text-lg">Đơn Robux của bạn</h3>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Chưa có đơn nào.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const s = o.status;
            const Icon = s === "completed" ? CheckCircle2 : s === "failed" ? XCircle : Loader2;
            const cls = s === "completed" ? "text-success" : s === "failed" ? "text-destructive" : "text-warning animate-spin";
            return (
              <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30">
                <Icon className={`w-5 h-5 ${cls}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{o.package_robux.toLocaleString()} Robux</div>
                  <div className="text-[11px] text-muted-foreground truncate">@{o.roblox_username}</div>
                </div>
                <div className="text-sm font-semibold text-primary">{formatVND(o.price)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
