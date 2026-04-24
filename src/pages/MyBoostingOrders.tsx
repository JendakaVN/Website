import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { formatVND } from "@/data/discount";
import { Swords, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  game: string;
  package: string;
  note: string | null;
  price: number;
  status: string;
  seen_by_admin: boolean;
  failure_reason: string | null;
  created_at: string;
}

export default function MyBoostingOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    const load = async () => {
      const { data } = await supabase
        .from("boosting_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as Order[]) ?? []);
      setLoading(false);
    };
    load();
    const ch = supabase.channel("my-boost")
      .on("postgres_changes", { event: "*", schema: "public", table: "boosting_orders", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, navigate]);

  const STATUS_LABEL: Record<string, string> = {
    pending: "Đang chờ",
    in_progress: "Đang cày",
    completed: "Hoàn thành",
    failed: "Thất bại",
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Swords className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Đơn cày của bạn</h1>
        </div>

        {loading ? (
          <p className="text-center py-10 text-muted-foreground">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">Chưa đặt đơn cày nào. Quay lại trang chủ để đặt.</p>
        ) : (
          <div className="space-y-2">
            {items.map((o) => {
              const Icon = o.status === "completed" ? CheckCircle2 : o.status === "failed" ? XCircle : Loader2;
              const cls = o.status === "completed" ? "text-success" : o.status === "failed" ? "text-destructive" : "text-warning animate-spin";
              return (
                <div key={o.id} className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${cls}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold">{o.game}</span>
                        <span className="font-bold text-primary">{formatVND(o.price)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Gói: {o.package}</div>
                      {o.note && <div className="text-xs text-muted-foreground italic mt-0.5">"{o.note}"</div>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className="text-[10px]">{STATUS_LABEL[o.status] ?? o.status}</Badge>
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
