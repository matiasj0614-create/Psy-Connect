import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contactRequests } from "@workspace/db";
import { SubmitContactRequestBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/contacts", async (req, res): Promise<void> => {
  const parsed = SubmitContactRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(contactRequests)
    .values({
      therapistName: parsed.data.therapistName,
      therapistProfileUrl: parsed.data.therapistProfileUrl ?? null,
      userName: parsed.data.userName,
      userEmail: parsed.data.userEmail,
      userMessage: parsed.data.userMessage ?? null,
      profileSummary: parsed.data.profileSummary ?? null,
    })
    .returning({ id: contactRequests.id, createdAt: contactRequests.createdAt });

  req.log.info({ id: row.id, therapist: parsed.data.therapistName }, "Contact request submitted");
  res.status(201).json(row);
});

export default router;
