import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "./AppShell";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase tự xử lý token recovery trong URL hash và phát sự kiện PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Phòng trường hợp event đã bắn trước khi mount
    supabase.auth.getSession().then(({ data, error }) => {
      if (data.session) setReady(true);
      setVerifying(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mật khẩu tối thiểu 6 ký tự");
    if (password !== confirm) return toast.error("Mật khẩu nhập lại không khớp");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Đổi mật khẩu thành công!");
      // Đợi 1 chút để user kịp đọc toast
      setTimeout(() => navigate("/auth"), 1500);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell hideNav forceTheme="light">
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass-card p-8 shadow-elevated animate-float-up border border-primary/20 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-glow border-2 border-white/10 bg-secondary">
            <img src="/favicon.webp" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-display font-bold gradient-text">JendakaVN</span>
        </Link>

        {verifying ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse">Đang xác thực bảo mật...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-primary/10 flex items-center justify-center border border-primary/20">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-display font-bold text-center mb-2">Mật khẩu mới</h1>
            <div className="flex flex-col items-center mb-8">
              <p className="text-center text-muted-foreground text-sm max-w-[280px]">
                {ready 
                  ? "Vui lòng nhập mật khẩu mới để tiếp tục truy cập vào hệ thống." 
                  : "Liên kết này không còn hiệu lực hoặc đã hết hạn."}
              </p>
            </div>

            {ready ? (
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="np" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mật khẩu mới</Label>
                  <Input
                    id="np"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="h-11 bg-secondary/30"
                    minLength={6}
                    maxLength={72}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cf" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nhập lại mật khẩu</Label>
                  <Input
                    id="cf"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••"
                    className="h-11 bg-secondary/30"
                    minLength={6}
                    maxLength={72}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-smooth shadow-glow text-base h-12 font-bold mt-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5 mr-2" /> Đổi mật khẩu ngay</>}
                </Button>
              </form>
            ) : (
              <Button 
                onClick={() => navigate("/auth")}
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 h-12 font-bold"
              >
                Yêu cầu gửi lại email mới
              </Button>
            )}

            <Link to="/auth" className="flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground hover:text-primary transition-smooth group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
              Quay lại đăng nhập
            </Link>
          </>
        )}
      </div>
      </div>
    </AppShell>
  );
}
