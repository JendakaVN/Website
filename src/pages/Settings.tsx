import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, Lock, LogOut, Wallet } from "lucide-react";
import { formatVND } from "@/data/discount";

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [pwd, setPwd] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const saveName = async () => {
    if (!name.trim()) return toast.error("Tên không được rỗng");
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
    setSavingName(false);
    if (error) return toast.error(error.message);
    toast.success("Đã cập nhật tên");
    await refreshProfile();
  };

  const savePwd = async () => {
    if (pwd.length < 6) return toast.error("Mật khẩu tối thiểu 6 ký tự");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    toast.success("Đổi mật khẩu thành công");
    setPwd("");
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Cài đặt tài khoản</h1>
        </div>

        <div className="glass-card p-5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Số dư hiện tại</div>
              <div className="font-bold text-lg">{formatVND(profile?.balance ?? 0)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Tổng đã nạp</div>
            <div className="font-semibold">{formatVND(profile?.total_deposited ?? 0)}</div>
          </div>
        </div>

        <div className="glass-card p-5 mb-4">
          <h2 className="font-display font-bold mb-3">Thông tin cá nhân</h2>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={user.email ?? ""} disabled />
            </div>
            <div>
              <Label className="text-xs">Tên hiển thị</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button onClick={saveName} disabled={savingName} className="bg-gradient-primary">
              <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
            </Button>
          </div>
        </div>

        <div className="glass-card p-5 mb-4">
          <h2 className="font-display font-bold mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Đổi mật khẩu
          </h2>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Mật khẩu mới</Label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
            </div>
            <Button onClick={savePwd} disabled={savingPwd} variant="outline">
              Cập nhật mật khẩu
            </Button>
          </div>
        </div>

        <Button variant="destructive" onClick={async () => { await signOut(); navigate("/auth"); }}>
          <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
        </Button>
      </div>
    </AppShell>
  );
}
