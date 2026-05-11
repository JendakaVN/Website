import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(255),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(72),
  displayName: z.string().trim().min(2, "Tên hiển thị tối thiểu 2 ký tự").max(40).optional(),
});