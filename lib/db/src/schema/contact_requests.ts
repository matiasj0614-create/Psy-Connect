import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactRequests = pgTable("contact_requests", {
  id: serial("id").primaryKey(),
  therapistName: text("therapist_name").notNull(),
  therapistProfileUrl: text("therapist_profile_url"),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  userMessage: text("user_message"),
  profileSummary: text("profile_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertContactRequestSchema = createInsertSchema(contactRequests).omit({
  id: true,
  createdAt: true,
});

export type ContactRequest = typeof contactRequests.$inferSelect;
export type InsertContactRequest = z.infer<typeof insertContactRequestSchema>;
