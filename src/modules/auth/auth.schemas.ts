import z from "zod";;

export const registerStartSchema = z.object({
  fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(120),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().min(11, 'Nomor HP minimal 11 karakter').max(20),
  password: z.string().min(8, 'Password minmal 8 karakter').max(128)
});

export const otpVerifySchema = z.object({
  registrationId: z.string().uuid('ID registrasi tidak valid'),
  otp: z.string().regex(/^\d{6}$/, 'OTP harus 6 digit angka')
});

export const registerCompleteSchema = z.object({
  onboardingToken: z.string().min(1, 'Token onboarding wajib diisi'),
  businessName: z.string().min(1, 'Nama bisnis wajib diisi').max(160),
  businessType: z.enum(['restaurant', 'retail', 'service']),
  country: z.string().min(1).default('Indonesia'),
  province: z.string().min(1, 'Provinsi wajib diisi'),
  city: z.string().min(1, 'Kota wajib diisi'),
  plan: z.enum([
    'Teratur Free',
    'Teratur Pro',
    'free_trial',
    'starter',
    'growth',
    'pro',
    'business'
  ]),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Anda harus menyetujui syarat dan ketentuan' }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
  rememberMe: z.boolean().default(false)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token wajib diisi')
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter').max(128)
});
