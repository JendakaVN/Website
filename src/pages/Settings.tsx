import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "./AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, Lock, LogOut, Wallet, Trash2, AlertTriangle, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { formatVND } from "@/data/discount";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut, loading } = useAuth();
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
  const isInitialized = useRef(false);
  const queryClient = useQueryClient();

  // Khởi tạo giá trị từ profile. Dùng isInitialized để tránh việc 
  // dữ liệu từ DB tự động ghi đè lên những gì người dùng đang nhập vào ô link.
  useEffect(() => {
    if (profile && !isInitialized.current) {
      const dbName = profile.display_name || "";
      const dbBg = (profile as any).background_url || "";
      setName(dbName);
      setBgUrl(dbBg);
      isInitialized.current = true;
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

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading || !user) return null;

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
    const newUrl = bgUrl?.trim() || "";
    
    // Security: Basic URL validation for background image
    const isValidUrl = (url: string) => {
      try { return new URL(url).protocol.startsWith('http'); } catch { return false; }
    };

    if (newUrl && !isValidUrl(newUrl)) return toast.error("Link ảnh không hợp lệ");

    setSavingBg(true);
    const oldUrl = (profile as any)?.background_url;

    // Nếu link mới khác link cũ và ảnh cũ là ảnh được lưu trên Storage (có chứa 'backgrounds/')
    // Chúng ta tiến hành xóa file cũ đi để tiết kiệm dung lượng
    if (oldUrl && oldUrl !== newUrl && oldUrl.includes("backgrounds/")) {
      const oldPath = oldUrl.split("backgrounds/")[1];
      if (oldPath) {
        await supabase.storage.from("backgrounds").remove([oldPath]);
      }
    }

    // Cập nhật URL mới (có thể là link ngoài hoặc link vừa upload) vào Database
    const { error } = await supabase.from("profiles").update({ background_url: newUrl }).eq("id", user.id);
    setSavingBg(false);

    if (error) return toast.error(error.message);
    toast.success("Đã cập nhật hình nền");
    await refreshProfile();
    queryClient.invalidateQueries(); // Refresh lại giao diện
  };

  // Hàm hỗ trợ chuyển đổi ảnh sang WebP để giảm dung lượng
  const convertToWebP = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          
          // Tối ưu kích thước: Giới hạn chiều rộng tối đa 1920px cho ảnh nền
          const maxWidth = 1920;
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Không thể tạo context canvas"));
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Chuyển đổi WebP thất bại"));
              const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: "image/webp",
              });
              resolve(webpFile);
            },
            "image/webp",
            0.9 // Chất lượng nén 90%
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) return toast.error("File quá lớn (tối đa 10MB)");
    
    // Ràng buộc chỉ cho phép tệp hình ảnh tại client
    if (!file.type.startsWith("image/")) {
      return toast.error("Vui lòng chỉ tải lên tệp hình ảnh (.jpg, .png, .gif)");
    }

    setUploading(true);
    try {
      let fileToUpload = file;
      let fileExt = file.name.split('.').pop()?.toLowerCase();

      // Nếu không phải ảnh động (GIF), tiến hành chuyển sang WebP để tối ưu dung lượng
      if (fileExt !== "gif") {
        fileToUpload = await convertToWebP(file);
        fileExt = "webp";
      }

      // 1. Xóa ảnh cũ trên Storage nếu tồn tại để tiết kiệm dung lượng
      const oldUrl = (profile as any)?.background_url;
      if (oldUrl && oldUrl.includes("backgrounds/")) {
        const oldPath = oldUrl.split("backgrounds/")[1];
        if (oldPath) {
          await supabase.storage.from("backgrounds").remove([oldPath]);
        }
      }

      // 2. Upload ảnh mới
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, fileToUpload);

      if (uploadError) {
        console.error("Storage Error:", uploadError);
        if (uploadError.message.includes("Object not found")) {
          throw new Error("Chưa tạo Bucket 'backgrounds' trên Supabase.");
        }
        throw uploadError;
      }

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

            {/* Xem trước hình nền để biết link có hoạt động hay không */}
            {bgUrl && (
              <div className="mt-2 rounded-lg border border-border/50 overflow-hidden bg-secondary/20 aspect-video relative group">
                <img src={bgUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold">Xem trước hiển thị</div>
              </div>
            )}

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
