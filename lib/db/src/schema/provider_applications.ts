import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const providerApplications = pgTable("provider_applications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  credentials: text("credentials").notNull(),
  email: text("email").notNull(),
  specialty: text("specialty").notNull(),
  modalities: text("modalities"),
  location: text("location"),
  telehealth: text("telehealth"),
  plan: text("plan").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertProviderApplicationSchema = createInsertSchema(providerApplications).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type ProviderApplication = typeof providerApplications.$inferSelect;
export type InsertProviderApplication = z.infer<typeof insertProviderApplicationSchema>;
