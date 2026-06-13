import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { SubmitProviderApplicationBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/providers/apply", async (req, res): Promise<void> => {
  const parsed = SubmitProviderApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!process.env.DATABASE_URL) {
    const row = { id: randomUUID(), createdAt: new Date().toISOString() };
    req.log.info(
      { id: row.id, email: parsed.data.email, plan: parsed.data.plan },
      "Demo provider application accepted without database",
    );
    res.status(201).json(row);
    return;
  }

  const { db, providerApplications } = await import("@workspace/db");
  const [row] = await db
    .insert(providerApplications)
    .values({
      name: parsed.data.name,
      credentials: parsed.data.credentials,
      email: parsed.data.email,
      specialty: parsed.data.specialty,
      modalities: parsed.data.modalities ?? null,
      location: parsed.data.location ?? null,
      telehealth: parsed.data.telehealth ?? null,
      plan: parsed.data.plan,
      message: parsed.data.message ?? null,
    })
    .returning({ id: providerApplications.id, createdAt: providerApplications.createdAt });

  req.log.info({ id: row.id, email: parsed.data.email, plan: parsed.data.plan }, "Provider application submitted");
  res.status(201).json(row);
});

export default router;
