import { z } from 'zod';

export type RoleInput = { name: string; description: string };

export const roleSchema = z.object({
  name: z.string().trim().min(1, 'Enter a role name.').max(60, 'Keep the name to 60 characters.'),
  description: z.string().trim().max(255, 'Keep the description to 255 characters.'),
});
