import { useState, useEffect } from "react";
import {
  DISCOUNT_TABLE,
  NETWORKS,
  NETWORK_COLORS,
  Network,
  creditedAmount,
  formatVND,
} from "@/data/discount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, ArrowRight, Loader2, Banknote, Copy, Check, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TELCO_MAP: Record<Network, string> = {
  Viettel: "VIETTEL",
  Vinaphone: "VINAPHONE",
  Mobifone: "MOBIFONE",
  Vietnamobile: "VIETNAMOBILE",
  Zing: "ZING",
  Garena: "GARENA",
};

const CARD_REQUIREMENTS: Record<Network, { s: number; p: number; min?: boolean }> = {
  Viettel: { s: 14, p: 15 },
  Vinaphone: { s: 14, p: 14 },
  Mobifone: { s: 15, p: 12 },
  Vietnamobile: { s: 10, p: 10, min: true },
  Zing: { s: 12, p: 9 },
  Garena: { s: 13, p: 16 },
};

// Hàm parse dữ liệu từ API getfee
function parseDiscountData(
  apiData: any
): Record<Network, Array<{ denomination: number; rate: number }>> {
  console.log("🔍 [parseDiscountData] Raw input:", apiData);

  let items: any[] = [];

  if (Array.isArray(apiData)) {
    items = apiData;
  } else if (apiData && typeof apiData === "object") {
    if (Array.isArray(apiData.data)) {
      items = apiData.data;
    } else if (apiData.body) {
      try {
        const parsedBody = JSON.parse(apiData.body);
        items = Array.isArray(parsedBody) ? parsedBody : [];
      } catch {
        items = [];
      }
    }
  }

  console.log(`📦 [parseDiscountData] Extracted ${items.length} items`);

  if (items.length === 0) {
    throw new Error("No discount items found");
  }

  const grouped: Record<string, Array<{ denomination: number; rate: number }>> =
    {};

  for (const item of items) {
    const telco = item.telco;
    const value = Number(item.value);
    const fee = Number(item.fees);

    if (!telco || isNaN(value) || isNaN(fee)) {
      console.warn("⚠️ [parseDiscountData] Skipping invalid item:", item);
      continue;
    }

    if (!grouped[telco]) grouped[telco] = [];
    grouped[telco].push({ denomination: value, rate: fee });
  }

  for (const telco in grouped) {
    grouped[telco].sort((a, b) => a.denomination - b.denomination);
  }

  console.log("🏷️ [parseDiscountData] Grouped telcos:", Object.keys(grouped));

  const mapping: Record<string, Network> = {
    VIETTEL: "Viettel",
    VINAPHONE: "Vinaphone",
    MOBIFONE: "Mobifone",
    VIETNAMOBILE: "Vietnamobile",
    VNMOBI: "Vietnamobile",
    ZING: "Zing",
    GARENA: "Garena",
  };

  const result = {} as Record<
    Network,
    Array<{ denomination: number; rate: number }>
  >;

  for (const net of NETWORKS) {
    result[net] = [];
  }

  for (const apiTelco in grouped) {
    const network = mapping[apiTelco];
    if (network && NETWORKS.includes(network)) {
      result[network] = grouped[apiTelco];
      console.log(
        `✅ [parseDiscountData] Mapped ${apiTelco} -> ${network} (${result[network].length} denominations)`
      );
    } else {
      console.warn(`❓ [parseDiscountData] Unknown telco: ${apiTelco}`);
    }
  }

  for (const net of NETWORKS) {
    if (result[net].length === 0) {
      console.warn(
        `⚠️ [parseDiscountData] No data for ${net}, using fallback DISCOUNT_TABLE`
      );
      result[net] = DISCOUNT_TABLE[net];
    }
  }

  console.log("✅ [parseDiscountData] Final result:", result);
  return result;
}

const QRCodeDisplay = ({ amount, depositCode }: { amount: number; depositCode: string }) => {
  // Security: Encode the depositCode to ensure it doesn't break the URL parameters
  const qrUrl = `https://img.vietqr.io/image/MB-0383732749-compact.png?amount=${amount}&addInfo=${encodeURIComponent(depositCode)}&accountName=NGUYEN%20NHAT%20HAO`;

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-5 h-5 text-black" />
        <span className="text-sm font-black text-black uppercase tracking-tighter">
          Quét mã VietQR
        </span>
      </div>

      {/* QR Code với loading state */}
      <div className="relative">
        <img
          src={qrUrl}
          alt="QR Code thanh toán"
          className="w-full max-w-[260px] aspect-square object-contain rounded-xl shadow-lg"
          onError={(e) => {
            console.error('QR load error');
            (e.target as HTMLImageElement).src = '/fallback-qr.png';
          }}
        />
      </div>

      {/* Hiển thị số tiền trong QR */}
      <div className="mt-4 p-3 bg-gray-100 rounded-xl text-center w-full">
        <p className="text-xs text-gray-500">Số tiền</p>
        <p className="font-bold text-xl text-primary">{formatVND(amount)}</p>
      </div>

      {/* Hướng dẫn */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
          <span className="inline-block w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
          Quét mã bằng app ngân hàng
        </p>
        <p className="text-[10px] text-gray-400 mt-2">
          Mã {depositCode} sẽ tự động điền vào nội dung
        </p>
      </div>
    </div>
  );
};

export function CardRecharge() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [network, setNetwork] = useState<Network>("Viettel");
  const [denom, setDenom] = useState<number | null>(null);
  const [serial, setSerial] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ serial?: string; pin?: string }>({});

  // Banking states
  const [bankingAmount, setBankingAmount] = useState<number>(50000);
  const [depositCode, setDepositCode] = useState<string | null>(null);
  const [creatingDeposit, setCreatingDeposit] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Đã sao chép!");
    setTimeout(() => setCopied(false), 2000);
  };

  const createBankingDeposit = async () => {
    if (!user) { navigate("/auth"); return; }
    if (bankingAmount < 10000) {
      toast.error("Số tiền tối thiểu là 10.000đ");
      return;
    }
    
    setCreatingDeposit(true);
    try {
      // Security: Use a more secure random generator for transaction codes
      const code = `NAP-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
      const { error } = await (supabase as any).from("pending_deposits").insert({
        user_id: user.id,
        code: code,
        amount: bankingAmount,
        status: "pending"
      });

      if (error) throw error;
      setDepositCode(code);
      toast.success("Đã tạo yêu cầu nạp tiền!");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo yêu cầu");
    } finally {
      setCreatingDeposit(false);
    }
  };

  const [discountTable, setDiscountTable] = useState<Record<
    Network,
    Array<{ denomination: number; rate: number }>
  > | null>(null);
  const [isLoadingDiscount, setIsLoadingDiscount] = useState(true);

  // Fetch bảng giá từ Edge Function get-discount
  useEffect(() => {
    const fetchDiscount = async () => {
      try {
        const response = await fetch(
          "https://psqqratdhxijxpdozltf.supabase.co/functions/v1/get-discount"
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        console.log("📡 Fetch data:", data);
        const parsed = parseDiscountData(data);
        setDiscountTable(parsed);
      } catch (err) {
        console.error("❌ Fetch failed:", err);
        toast.error("Dùng bảng giá mặc định");
        setDiscountTable(DISCOUNT_TABLE);
      } finally {
        setIsLoadingDiscount(false);
      }
    };

    fetchDiscount();
  }, []);

  // Khi discountTable hoặc network thay đổi, chọn mệnh giá đầu tiên
  useEffect(() => {
    if (discountTable && discountTable[network]?.length > 0) {
      setDenom(discountTable[network][0].denomination);
    } else {
      setDenom(null);
    }
  }, [network, discountTable]);

  // Nếu đang loading hoặc dữ liệu chưa sẵn sàng
  if (isLoadingDiscount || !discountTable || denom === null) {
    return (
      <section id="card" className="container mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-display font-bold mb-2">
            Nạp thẻ <span className="gradient-text">chiết khấu thấp</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Đang tải bảng giá...
          </p>
        </div>
        <div className="glass-card p-5 sm:p-8 max-w-4xl mx-auto flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  const entries = discountTable[network];
  const selected = entries.find((e) => e.denomination === denom) ?? entries[0];
  const credited = creditedAmount(selected.denomination, selected.rate);

  // Kiểm tra độ dài hợp lệ theo nhà mạng
  const req = CARD_REQUIREMENTS[network];
  const isComplete = req.min
    ? serial.length >= req.s && pin.length >= req.p
    : serial.length === req.s && pin.length === req.p;

  // Xác định lý do nút bị vô hiệu hóa
  let disabledReason = "";
  if (submitting) {
    disabledReason = "Đang xử lý giao dịch...";
  } else if (!user) {
    disabledReason = "Vui lòng đăng nhập để nạp thẻ";
  } else if (!isComplete) {
    disabledReason = "Vui lòng nhập đủ Serial và Mã thẻ theo yêu cầu";
  }

  const onNetworkChange = (n: Network) => {
    setNetwork(n);
  };

  const handleRecharge = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để nạp thẻ");
      navigate("/auth");
      return;
    }

    // Logic kiểm tra độ dài và định dạng cụ thể theo yêu cầu
    let serialErr = "";
    let pinErr = "";

    if (network === "Garena") {
      if (!/^[A-Z0-9]{13}$/.test(serial)) serialErr = "Serial Garena phải đúng 13 ký tự";
      if (!/^[A-Z0-9]{16}$/.test(pin)) pinErr = "Mã thẻ Garena phải đúng 16 ký tự";
    } else if (network === "Zing") {
      if (!/^[A-Z0-9]{12}$/.test(serial)) serialErr = "Serial Zing phải đúng 12 ký tự";
      if (!/^[A-Z0-9]{9}$/.test(pin)) pinErr = "Mã thẻ Zing phải đúng 9 ký tự";
    } else if (network === "Viettel") {
      if (!/^[A-Z0-9]{14}$/.test(serial)) serialErr = "Serial Viettel phải đúng 14 ký tự";
      if (!/^[A-Z0-9]{15}$/.test(pin)) pinErr = "Mã thẻ Viettel phải đúng 15 ký tự";
    } else if (network === "Mobifone") {
      if (!/^[A-Z0-9]{15}$/.test(serial)) serialErr = "Serial Mobifone phải đúng 15 ký tự";
      if (!/^[A-Z0-9]{12}$/.test(pin)) pinErr = "Mã thẻ Mobifone phải đúng 12 ký tự";
    } else if (network === "Vinaphone") {
      if (!/^[A-Z0-9]{14}$/.test(serial)) serialErr = "Serial Vinaphone phải đúng 14 ký tự";
      if (!/^[A-Z0-9]{14}$/.test(pin)) pinErr = "Mã thẻ Vinaphone phải đúng 14 ký tự";
    } else if (network === "Vietnamobile") {
      if (serial.length < 10) serialErr = "Serial quá ngắn";
      if (pin.length < 10) pinErr = "Mã thẻ quá ngắn";
    }

    if (serialErr || pinErr) {
      setErrors({ serial: serialErr, pin: pinErr });
      toast.error(serialErr || pinErr);
      return;
    }

    if (!network || !denom) {
      toast.error("Vui lòng chọn nhà mạng và mệnh giá");
      return;
    }

    const payload = {
      telco: TELCO_MAP[network],
      amount: denom,
      serial: serial.trim(),
      code: pin.trim(),
    };

    try {
      setSubmitting(true);
      // Get the current session to include the JWT for Edge Function authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        "https://psqqratdhxijxpdozltf.supabase.co/functions/v1/card-recharge",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();

      if (data?.status === 99) {
        toast.success("Gửi thẻ thành công! Đang chờ duyệt.");
        await refreshProfile();
        setSerial("");
        setPin("");
        setErrors({});
      } else {
        toast.error(data?.message || "Giao dịch thất bại");
      }
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="card" className="container mx-auto px-4 py-10 sm:py-14">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-4xl font-display font-bold mb-2">
          Nạp thẻ <span className="gradient-text">chiết khấu thấp</span>
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Hỗ trợ 6 nhà mạng, tự động duyệt trong vài giây.
        </p>
      </div>

      <div className="glass-card p-5 sm:p-8 max-w-4xl mx-auto">
        <Tabs defaultValue="card" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Thẻ cào
            </TabsTrigger>
            <TabsTrigger value="banking" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Banking (Duyệt nhanh)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-6">
              {NETWORKS.map((n) => (
                <button
                  key={n}
                  onClick={() => onNetworkChange(n)}
                  className={`relative px-2 py-3 rounded-xl border-2 transition-bounce text-xs sm:text-sm font-semibold ${
                    network === n
                      ? "border-primary bg-primary/10 text-foreground shadow-glow"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span
                    className={`block w-full h-1 rounded-full mb-2 bg-gradient-to-r ${NETWORK_COLORS[n]}`}
                  />
                  {n}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-3 block">Mệnh giá</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {entries.map((e) => (
                    <button
                      key={e.denomination}
                      onClick={() => setDenom(e.denomination)}
                      className={`px-3 py-3 rounded-xl text-sm font-semibold transition-smooth border ${
                        denom === e.denomination
                          ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                          : "border-border bg-secondary/40 hover:border-primary/50"
                      }`}
                    >
                      <div>{formatVND(e.denomination)}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          denom === e.denomination
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        Phí {e.rate}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="serial">Serial</Label>
                  <Input
                    id="serial"
                    value={serial}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                      setSerial(value);
                      setErrors((prev) => ({ ...prev, serial: undefined }));
                    }}
                    placeholder="Nhập số serial"
                    maxLength={req.min ? 25 : req.s}
                    inputMode="text"
                    className={errors.serial ? "border-red-500" : ""}
                  />
                  {errors.serial && (
                    <p className="text-red-500 text-sm mt-1">{errors.serial}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="pin">Mã thẻ</Label>
                  <Input
                    id="pin"
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                      setPin(value);
                      setErrors((prev) => ({ ...prev, pin: undefined }));
                    }}
                    placeholder="Nhập mã thẻ cào"
                    maxLength={req.min ? 25 : req.p}
                    inputMode="text"
                    className={errors.pin ? "border-red-500" : ""}
                  />
                  {errors.pin && (
                    <p className="text-red-500 text-sm mt-1">{errors.pin}</p>
                  )}
                </div>

                <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mệnh giá</span>
                    <span className="font-semibold">
                      {formatVND(selected.denomination)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phí giao dịch</span>
                    <span className="text-warning font-semibold">
                      {selected.rate}%
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border/40 pt-2 mt-2">
                    <span>Bạn nhận</span>
                    <span className="text-success font-bold">
                      {formatVND(credited)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleRecharge}
                  disabled={submitting || (user ? !isComplete : false)}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-smooth shadow-glow h-12 font-semibold text-base"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {submitting
                    ? "Đang xử lý..."
                    : user
                    ? `Nạp ngay +${formatVND(credited)}`
                    : "Đăng nhập để nạp"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="banking">
            <div className="space-y-6">
              {!depositCode ? (
                <div className="space-y-4 max-w-md mx-auto py-8">
                  <div className="text-center mb-6">
                    <Banknote className="w-12 h-12 text-primary mx-auto mb-2 opacity-50" />
                    <h3 className="font-bold text-lg">Nạp tiền qua Ngân hàng</h3>
                    <p className="text-xs text-muted-foreground">Hệ thống duyệt tự động qua Casso trong 1-3 phút.</p>
                  </div>
                  <div>
                    <Label>Số tiền muốn nạp (VNĐ)</Label>
                    <Input 
                      type="number" 
                      min={10000}
                      step={10000}
                      value={bankingAmount} 
                      onChange={(e) => setBankingAmount(Number(e.target.value))}
                      placeholder="Ví dụ: 50000"
                      className="h-12 text-lg font-bold"
                    />
                  </div>
                  <Button onClick={createBankingDeposit} disabled={creatingDeposit} className="w-full bg-gradient-primary h-12 text-lg font-bold shadow-glow">
                    {creatingDeposit ? "Đang tạo mã..." : "Tiếp tục"}
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8 items-start py-4">
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-4">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Ngân hàng</Label>
                        <div className="font-bold text-primary">MB BANK (Ngân hàng Quân Đội)</div>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Số tài khoản</Label>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-xl tracking-wider">0383732749</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard("0383732749")} className="h-8 w-8 p-0">
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Chủ tài khoản</Label>
                        <div className="font-bold uppercase">NGUYEN NHAT HAO</div>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-xl border-2 border-primary/30 animate-pulse-glow">
                        <Label className="text-[10px] uppercase text-primary font-black">Nội dung chuyển khoản</Label>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono font-black text-2xl text-primary">{depositCode}</span>
                          <Button variant="secondary" size="sm" onClick={() => copyToClipboard(depositCode)} className="font-bold">
                            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />} SAO CHÉP
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button variant="link" className="w-full text-muted-foreground text-xs" onClick={() => setDepositCode(null)}>
                      Thay đổi số tiền hoặc tạo mã mới
                    </Button>
                  </div>
                  
                  <QRCodeDisplay amount={bankingAmount} depositCode={depositCode!} />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}