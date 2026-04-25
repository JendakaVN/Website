import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/data/discount";
import { Trophy, Crown, Medal, Calendar } from "lucide-react";

interface Row {
  id: string;
  display_name: string;
  total_deposited: number;
}

export function Leaderboard() {
  const [allTime, setAllTime] = useState<Row[]>([]);
  const [monthly, setMonthly] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        // Fetch Top nạp từ trước đến nay
        const { data: atData } = await supabase
          .from("profiles")
          .select("id,display_name,total_deposited")
          .order("total_deposited", { ascending: false })
          .limit(10);
        
        // Fetch Top nạp trong tháng hiện tại
        const { data: mData, error: mError } = await supabase.rpc('get_monthly_leaderboard' as any);
        
        if (mError) {
          console.error("Lỗi lấy top tháng:", mError);
        }
        
        const mRows = (mData as unknown as Row[]) ?? [];
        
        // Cập nhật state 1 lần duy nhất để tránh giật lag UI
        setAllTime((atData as Row[]) ?? []);
        setMonthly(mRows);
      } finally {
        setIsLoading(false);
      }
    };

    load();
    const ch = supabase.channel("lb")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const icon = (i: number) =>
    i === 0 ? <Crown className="w-4 h-4 text-warning" /> :
    i === 1 ? <Medal className="w-4 h-4 text-muted-foreground" /> :
    i === 2 ? <Medal className="w-4 h-4 text-orange-400" /> :
    <span className="text-muted-foreground font-semibold w-4 text-center text-xs">{i + 1}</span>;

  const ListSection = ({ 
    title, 
    icon: TitleIcon, 
    items, 
    variant = "warning" 
  }: { 
    title: string, 
    icon: any, 
    items: Row[],
    variant?: "warning" | "accent"
  }) => {
    const max = items[0]?.total_deposited || 1;
    const top3 = items.slice(0, 3);
    
    const barColor = variant === "warning" ? "bg-warning/20" : "bg-accent/20";
    const textColor = variant === "warning" ? "text-warning" : "text-accent";
    const borderColor = variant === "warning" ? "border-warning/30" : "border-accent/30";
    const iconColor = variant === "warning" ? "text-warning" : "text-accent";

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className={iconColor}>{TitleIcon}</div>
          <h3 className="font-display font-bold text-lg">{title}</h3>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
        ) : (
          <div className="flex flex-col">
            {/* Biểu đồ cột Podium cho Top 3 */}
            <div className="flex items-end justify-center gap-1 sm:gap-2 mb-8 h-24 sm:h-32 px-1">
              {/* Hạng 2 */}
              {top3[1] && (
                <div className="flex-1 flex flex-col items-center min-w-0">
                  <div className="text-[8px] sm:text-[10px] font-bold text-muted-foreground mb-1 truncate w-full text-center">{formatVND(top3[1].total_deposited)}</div>
                  <div className={`w-full ${barColor} rounded-t-lg relative transition-all duration-500`} style={{ height: `${(top3[1].total_deposited / max) * 75}%` }}>
                    <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2">
                      <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Hạng 1 */}
              {top3[0] && (
                <div className="flex-1 flex flex-col items-center min-w-0">
                  <div className={`text-[9px] sm:text-[11px] font-bold ${textColor} mb-1 truncate w-full text-center`}>{formatVND(top3[0].total_deposited)}</div>
                  <div className={`w-full ${barColor} border-x border-t ${borderColor} rounded-t-xl relative shadow-glow-sm transition-all duration-500`} style={{ height: '95%' }}>
                    <div className="absolute -top-6 sm:-top-7 left-1/2 -translate-x-1/2">
                      <Crown className={`w-5 h-5 sm:w-6 sm:h-6 ${variant === 'warning' ? 'text-warning' : 'text-accent'} animate-bounce`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Hạng 3 */}
              {top3[2] && (
                <div className="flex-1 flex flex-col items-center min-w-0">
                  <div className="text-[8px] sm:text-[10px] font-bold text-muted-foreground mb-1 truncate w-full text-center">{formatVND(top3[2].total_deposited)}</div>
                  <div className={`w-full ${barColor} rounded-t-lg relative transition-all duration-500`} style={{ height: `${(top3[2].total_deposited / max) * 60}%` }}>
                    <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2">
                      <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Danh sách đầy đủ thành từng dòng */}
            <div className="space-y-1.5">
              {items.slice(0, 7).map((r, i) => (
                <div key={r.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-smooth ${i < 3 ? "bg-secondary/40 border border-border/50" : "bg-secondary/15 hover:bg-secondary/25"}`}>
                  <div className="w-6 flex justify-center">{icon(i)}</div>
                  <div className="flex-1 truncate font-medium text-[11px]">{r.display_name}</div>
                  <div className={`text-[11px] font-bold ${i === 0 ? textColor : "text-foreground/80"}`}>{formatVND(r.total_deposited)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-card p-5 sm:p-6 xl:col-span-2 h-[450px] overflow-hidden">
      <div className="grid sm:grid-cols-2 gap-y-12 sm:gap-x-0 h-full overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-warning/20 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="flex flex-col sm:pr-6 md:pr-8">
          <ListSection title="Top nạp đại gia" icon={<Trophy className="w-5 h-5" />} items={allTime} variant="warning" />
        </div>
        <div className="border-t sm:border-t-0 sm:border-l border-border/40 pt-10 sm:pt-0 sm:pl-6 md:pl-8 flex flex-col">
          <ListSection title="Top nạp tháng" icon={<Calendar className="w-5 h-5" />} items={monthly} variant="accent" />
        </div>
      </div>
    </div>
  );
}
