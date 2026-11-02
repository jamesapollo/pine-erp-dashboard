import { z } from 'zod';

export const staffNameSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(255, 'Name must be 255 characters or fewer'),
});

export type StaffNameInput = z.infer<typeof staffNameSchema>;
