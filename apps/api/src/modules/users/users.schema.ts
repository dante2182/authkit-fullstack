import { z } from 'zod'

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    image: z.url().max(2048).nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.image !== undefined, {
    message: 'Debes enviar al menos un campo',
  })

export type UpdateUserInput = z.infer<typeof updateUserSchema>
