import { z } from "zod";
export const uploadAttachmentSchema = z.object({
    chatId: z.string({ required_error: "chatId is required" })
});
