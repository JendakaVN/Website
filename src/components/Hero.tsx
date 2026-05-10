import { Sparkles, Zap, Trophy } from "lucide-react";

export function Hero() {
  return (
    <section className="container mx-auto px-4 pt-2 pb-8 sm:pt-4 sm:pb-12 min-h-[320px] sm:min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-3xl mx-auto animate-float-up w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs sm:text-sm text-primary mb-4">
          <Sparkles className="w-3 h-3" /> Shop Roblox & Card uy tín #1 Việt Nam
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold leading-tight mb-4">
          Nạp thẻ siêu nhanh, <br className="hidden sm:block" />
          <span className="gradient-text">Robux giá tốt nhất</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-6">
          Chiết khấu tối đa chỉ <span className="text-primary font-semibold">21%</span>, nhận Robux trong vài phút,
          chơi mini game thưởng cực lớn.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4 text-warning" /> Tự động 24/7
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="w-4 h-4 text-warning" /> 50.000+ khách hàng
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary-glow" /> Bảo mật tuyệt đối
          </div>
        </div>
      </div>
    </section>
  );
}
