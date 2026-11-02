import { z } from 'zod';

export const acceptInviteSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter your name.').max(255, 'Use at most 255 characters.'),
    password: z.string().min(12, 'Use at least 12 characters.'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match.",
    path: ['password_confirmation'],
  });

export type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;
