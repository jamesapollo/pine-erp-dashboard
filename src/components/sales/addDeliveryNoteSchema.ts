import { z } from 'zod';

const NOTE_MAXIMUM_LENGTH = 500;

export const addDeliveryNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Write a note')
    .max(NOTE_MAXIMUM_LENGTH, 'Keep the note to 500 characters or fewer'),
});

export type AddDeliveryNoteInput = z.infer<typeof addDeliveryNoteSchema>;
