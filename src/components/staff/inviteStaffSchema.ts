import { z } from 'zod';

export type InviteStaffInput = { email: string; roleId: string };

export const inviteStaffSchema = z.object({
  email: z.string().trim().min(1, "Enter the person's email.").email('Enter a valid email.'),
  roleId: z.string().min(1, 'Choose a role.'),
});
