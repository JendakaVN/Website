import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/data/discount";
import { Trophy, Crown, Medal } from "lucide-react";

interface Row {
  id: string;
  display_name: string;
  total_deposited: number;
}

export function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,total_deposited")
        .order("total_deposited", { ascending: false })
        .limit(10);
      setRows((data as Row[]) ?? []);
    };
    load();
    const ch = supabase.channel("lb")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const icon = (i: number) =>
    i === 0 ? <Crown className="w-5 h-5 text-warning" /> :
    i === 1 ? <Medal className="w-5 h-5 text-muted-foreground" /> :
    i === 2 ? <Medal className="w-5 h-5 text-orange-400" /> :
    <span className="text-muted-foreground font-semibold w-5 text-center">{i + 1}</span>;

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-warning" />
        <h3 className="font-display font-bold text-lg">Top nạp tiền</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu — hãy là người đầu tiên!</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${i < 3 ? "bg-gradient-card border border-primary/20" : "bg-secondary/30"}`}>
              <div className="w-7 flex justify-center">{icon(i)}</div>
              <div className="flex-1 truncate font-semibold">{r.display_name}</div>
              <div className={`text-sm font-bold ${i === 0 ? "text-warning" : "text-primary"}`}>{formatVND(r.total_deposited)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
