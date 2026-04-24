import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Gamepad2, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase tự xử lý token recovery trong URL hash và phát sự kiện PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Phòng trường hợp event đã bắn trước khi mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
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
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass-card p-8 shadow-elevated animate-float-up">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Gamepad2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-display font-bold gradient-text">JendakaVN</span>
        </Link>

        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
            <KeyRound className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-display font-bold text-center mb-2">Đặt lại mật khẩu</h1>
        <p className="text-center text-muted-foreground mb-6 text-sm">
          {ready ? "Nhập mật khẩu mới của bạn" : "Đang xác thực liên kết..."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="np">Mật khẩu mới</Label>
            <Input
              id="np"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              minLength={6}
              maxLength={72}
              required
              disabled={!ready}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf">Nhập lại mật khẩu</Label>
            <Input
              id="cf"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••"
              minLength={6}
              maxLength={72}
              required
              disabled={!ready}
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !ready}
            className="w-full bg-gradient-primary hover:opacity-90 transition-smooth shadow-glow text-base h-11 font-semibold"
          >
            {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </Button>
        </form>

        <Link to="/auth" className="block w-full mt-4 text-center text-sm text-muted-foreground hover:text-primary transition-smooth">
          ← Quay lại đăng nhập
        </Link>
      </div>
    </main>
  );
}
