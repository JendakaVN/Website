import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Gamepad2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const schema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(255),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(72),
  displayName: z.string().trim().min(2, "Tên hiển thị tối thiểu 2 ký tự").max(40).optional(),
});

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email("Email không hợp lệ").safeParse(forgotEmail);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/v1/callback`,
      });
      if (error) throw error;
      toast.success("Đã gửi liên kết đặt lại mật khẩu vào email!");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/v1/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = mode === "signup" ? form : { email: form.email, password: form.password };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/v1/callback`,
            data: { display_name: form.displayName },
          },
        });
        if (error) throw error;
        toast.success("Đăng ký thành công! Đang chuyển hướng...");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Đăng nhập thành công!");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message?.includes("Invalid") ? "Email hoặc mật khẩu không đúng" : err.message);
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

        <h1 className="text-2xl font-display font-bold text-center mb-2">
          {mode === "signin" ? "Chào mừng trở lại" : "Tạo tài khoản"}
        </h1>
        <p className="text-center text-muted-foreground mb-6 text-sm">
          {mode === "signin" ? "Đăng nhập để nạp thẻ & mua Robux" : "Đăng ký miễn phí trong 30 giây"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="dn">Tên hiển thị</Label>
              <Input
                id="dn"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="Player123"
                maxLength={40}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="em">Email</Label>
            <Input
              id="em"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              maxLength={255}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Mật khẩu</Label>
            <Input
              id="pw"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••"
              minLength={6}
              maxLength={72}
              required
            />
          </div>
          {mode === "signin" && (
            <button
              type="button"
              onClick={() => { setForgotEmail(form.email); setForgotOpen(true); }}
              className="w-full text-right text-xs text-muted-foreground hover:text-primary transition-smooth -mt-2"
            >
              Quên mật khẩu?
            </button>
          )}
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90 transition-smooth shadow-glow text-base h-11 font-semibold">
            {loading ? "Đang xử lý..." : mode === "signin" ? "Đăng nhập" : "Đăng ký"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Hoặc tiếp tục với</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full transition-smooth" 
          onClick={signInWithGoogle}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-primary transition-smooth"
        >
          {mode === "signin" ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Quên mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập email của bạn, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={sendReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fe">Email</Label>
              <Input
                id="fe"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={255}
                required
              />
            </div>
            <Button type="submit" disabled={forgotLoading} className="w-full bg-gradient-primary font-semibold">
              {forgotLoading ? "Đang gửi..." : "Gửi liên kết"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
