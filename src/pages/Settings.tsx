import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, Lock, LogOut, Wallet, Trash2, AlertTriangle, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { formatVND } from "@/data/discount";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [bgUrl, setBgUrl] = useState((profile as any)?.background_url ?? "");
  const [pwd, setPwd] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingBg, setSavingBg] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [countdown, setCountdown] = useState(0);
  const queryClient = useQueryClient();

  // Đồng bộ dữ liệu khi profile thay đổi (Sửa lỗi đổi tên không hiện)
  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setBgUrl((profile as any).background_url || "");
    }
  }, [profile]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

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

  const saveBg = async () => {
    setSavingBg(true);
    const { error } = await supabase.from("profiles").update({ background_url: bgUrl.trim() }).eq("id", user.id);
    setSavingBg(false);
    if (error) return toast.error(error.message);
    toast.success("Đã cập nhật hình nền");
    await refreshProfile();
    queryClient.invalidateQueries(); // Refresh lại giao diện
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh quá lớn (tối đa 5MB)");
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath);

      setBgUrl(publicUrl);
      toast.success("Tải ảnh lên thành công, nhấn Lưu để áp dụng");
    } catch (err: any) {
      toast.error("Lỗi: " + err.message);
    } finally {
      setUploading(false);
    }
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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_own_account" as any, {});
      if (error) throw error;
      
      toast.success("Tài khoản đã được xóa vĩnh viễn.");
      // Xóa cache để bảng xếp hạng cập nhật ngay lập tức
      queryClient.invalidateQueries({ queryKey: ['leaderboard-alltime'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard-monthly'] });
      await signOut();
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
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
            <ImageIcon className="w-4 h-4 text-primary" /> Hình nền website
          </h2>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Link ảnh hoặc tải lên (.jpg, .png, .gif)</Label>
              <div className="flex gap-2">
                <Input value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} placeholder="https://example.com/image.gif" />
                <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button onClick={saveBg} disabled={savingBg} variant="outline" className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" /> Lưu hình nền
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

        <div className="flex flex-col gap-3">
          <Button variant="outline" className="w-full justify-start" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
          </Button>

          <div className="mt-8 pt-6 border-t border-destructive/20">
            <h2 className="text-destructive font-display font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Khu vực nguy hiểm
            </h2>
            <Dialog onOpenChange={(open) => open && setCountdown(10)}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all">
                  <Trash2 className="w-4 h-4 mr-2" /> Xóa tài khoản vĩnh viễn
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bạn có chắc chắn muốn xóa tài khoản?</DialogTitle>
                  <DialogDescription>
                    Hành động này không thể hoàn tác. Toàn bộ số dư ({formatVND(profile?.balance ?? 0)}) và lịch sử giao dịch của bạn sẽ bị mất vĩnh viễn.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => {}}>Hủy</Button>
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting || countdown > 0}>
                    {deleting ? "Đang xử lý..." : countdown > 0 ? `Xác nhận xóa (${countdown}s)` : "Xác nhận xóa"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
