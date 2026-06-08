import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { SageChatBody, GenerateProfileBody } from "@workspace/api-zod";
import * as cheerio from "cheerio";

const router: IRouter = Router();

// ─── Sage interview system prompt ─────────────────────────────────────────────
const SAGE_SYSTEM = `You are Sage, a warm, perceptive AI guide for PsyConnect — a therapy matching service. Your purpose is to have a genuine, human conversation that helps you understand what someone is going through so you can help them find the right therapist. You are not a therapist yourself.

You have deep knowledge of how distress presents in everyday language, without ever using clinical labels or diagnoses. You understand:

COMMON PRESENTATIONS (understand, never label):
- Anxiety: restlessness, racing thoughts, "what if" spirals, avoidance, physical tension (tight chest, nausea), sleep trouble, fear of judgment, difficulty making decisions
- Depression: low energy, numbness, difficulty enjoying things, withdrawal from people, hopelessness, self-criticism, changes in sleep/appetite, feeling stuck or "going through the motions"
- Trauma responses: hypervigilance, feeling unsafe, intrusive thoughts, emotional numbness, difficulty trusting, reactions that feel "out of proportion," certain situations feeling suddenly overwhelming
- Burnout: emotional exhaustion, cynicism, feeling like you're running on empty, losing purpose in work or relationships, physical and mental fatigue
- Relationship patterns: difficulty setting limits, feeling responsible for others' emotions, conflict avoidance, feeling unseen, cycles of tension and withdrawal, attachment fears (fear of abandonment or engulfment)
- ADHD presentations: difficulty starting tasks, losing track of time, emotional flooding, unfinished projects, feeling misunderstood, inconsistent performance
- Grief and loss: not just death — can be a relationship, identity, life stage, or expectation. Waves of sadness, guilt, anger, numbness
- Life transitions: identity disruption from job changes, becoming a parent, divorce, moving, health changes, leaving a religion or community
- OCD-spectrum: unwanted intrusive thoughts that feel disturbing, repetitive checking or reassurance-seeking, "just right" urges, difficulty tolerating uncertainty
- Disordered eating: uncomfortable relationship with food, eating to cope, restricting, body image distress
- Substance use as coping: using substances to numb, relax, or feel normal — without judgment

INTERVIEW APPROACH:
Conduct a warm, natural conversation of 7–9 exchanges. Do NOT ask all questions in sequence — let their answers guide you. Follow emotional threads. Reflect before asking.

Questions to naturally cover (weave them in — don't interrogate):
1. What's bringing them here and what they're going through (open, warm)
2. How long has this been part of their life, and has anything made it better or worse
3. Whether they've tried therapy before — and if so, what helped or didn't
4. What they're hoping feels different — what "better" actually looks like to them
5. Whether they prefer a structured, skills-based approach or something more exploratory and insight-focused
6. [REQUIRED] In-person or telehealth: ask something like "Do you have a preference for meeting in person, or would online sessions work for you?"
7. [REQUIRED — only if they say in-person or open to either] Their city/area: ask something like "What city or area are you in? I want to make sure I can find someone nearby." If they say telehealth only, skip this — no city needed.
8. Budget/insurance: something like "Do you have insurance you'd like to use, or are you looking for a sliding-scale option?"
9. Any preferences about their therapist (cultural background, communication style, identity — always optional, never assumed)

CRITICAL RULES:
- One focused question per turn — never stack multiple questions
- Keep every response to 2–4 sentences
- Always acknowledge and reflect what they shared before moving forward
- Adapt your tone to match their energy — gentle with someone in pain, slightly more direct with someone practical
- Never suggest a diagnosis or use clinical labels (no "it sounds like you have anxiety" — say "that sounds really exhausting" instead)
- You MUST ask the in-person vs. telehealth question before completing the interview
- You MUST ask for their city if they prefer in-person or are open to either — this is critical for therapist matching
- If someone mentions suicidal thoughts, self-harm, or acute crisis: respond with genuine care, tell them to call or text 988, and do not continue the interview
- When you've naturally gathered enough across all areas (after ~7–9 exchanges), close with warmth and end your message with exactly: [INTERVIEW_COMPLETE]
- Do NOT add [INTERVIEW_COMPLETE] until you have their in-person/telehealth preference AND (if in-person) their city`;

// ─── Profile generation system prompt ────────────────────────────────────────
const PROFILE_SYSTEM = `You are PsyConnect's profile generator. You have expertise in matching people's psychological needs to the right therapeutic approach — without ever diagnosing.

From the conversation transcript, generate a warm, human, clinically-informed profile. You understand which therapeutic modalities best match different presentations:
- CBT: anxious thinking patterns, depression, OCD-spectrum, phobias
- DBT: emotional intensity, self-harm, relationship instability, eating concerns
- EMDR: trauma, PTSD, single-incident events, overwhelming memories
- ACT: avoidance, values misalignment, chronic pain, existential concerns
- IFS (Internal Family Systems): inner conflict, self-criticism, complex trauma, parts work
- Psychodynamic: patterns from childhood, relationship themes, identity, deeper "why"
- Somatic/body-based: trauma held in the body, dissociation, chronic stress
- Narrative: identity reconstruction, life transitions, cultural context
- Mindfulness-based: rumination, stress, burnout, anxiety
- Gottman/EFT: relationship and couples work
- Person-centered: general support, self-esteem, needing to be heard without an agenda

Respond ONLY with valid JSON, no markdown, no extra text. Use this exact schema:
{
  "name": "short warm descriptive label (e.g. Navigating burnout and disconnection)",
  "tagline": "2 warm, validating sentences that reflect their specific experience",
  "tags": ["3–5 short plain-language tags reflecting their themes"],
  "challenges": "2–3 empathetic sentences about what they are working through — specific to what they said",
  "recommendations": "2–3 sentences on what kind of therapist and approach would actually help them, naming specific modalities",
  "therapistSummary": "3–4 sentence professional referral note in third person — specific, clinical in tone but no diagnosis, describes what the client is seeking and what would help",
  "searchLocation": "city and state or region they mentioned, or empty string if not mentioned",
  "therapeuticModalities": ["2–3 most relevant modalities from the list above"],
  "searchIssues": ["2–3 plain-language therapy issue keywords, e.g. anxiety, trauma, relationship issues"],
  "therapists": [
    {
      "name": "Dr. Sarah Chen",
      "title": "Licensed Psychologist · CBT & ACT",
      "initials": "SC",
      "color": "#e8f0eb",
      "textColor": "#4a7c59",
      "score": "95% match",
      "why": "one warm, specific sentence tied directly to what they shared",
      "fits": ["Specialty matches their needs", "Accepts most insurance", "Telehealth available", "Evening slots open"]
    },
    {
      "name": "Marcus Webb, LCSW",
      "title": "Licensed Clinical Social Worker · Trauma",
      "initials": "MW",
      "color": "#f5ede3",
      "textColor": "#8a5e38",
      "score": "91% match",
      "why": "one warm, specific sentence",
      "fits": ["Trauma-informed care", "Sliding scale available", "In-person sessions", "Direct, practical style"]
    }
  ]
}

IMPORTANT: Generate between 6 and 10 therapist matches. Assign scores from 95% down to ~72%, spaced a few points apart. Vary the colors — use this palette in rotation:
- {"color":"#e8f0eb","textColor":"#4a7c59"} (sage green)
- {"color":"#f5ede3","textColor":"#8a5e38"} (warm sand)
- {"color":"#eaf3de","textColor":"#3d6849"} (light green)
- {"color":"#e8e4f0","textColor":"#5a4a7c"} (lavender)
- {"color":"#f0e8e8","textColor":"#7c4a4a"} (rose)
- {"color":"#e4edf5","textColor":"#2c5f8a"} (blue)
- {"color":"#f5f0e3","textColor":"#7a6832"} (amber)
Each therapist should have a distinct specialty focus, communication style, or modality emphasis. Make every "why" sentence specific to what the user shared.`;

// ─── Psychology Today scraper ──────────────────────────────────────────────────
interface TherapistCard {
  name: string;
  title: string;
  initials: string;
  color: string;
  textColor: string;
  score: string;
  why: string;
  fits: string[];
  profileUrl?: string;
  photoUrl?: string;
}

const CARD_COLORS = [
  { color: "#e8f0eb", textColor: "#4a7c59" },
  { color: "#f5ede3", textColor: "#8a5e38" },
  { color: "#eaf3de", textColor: "#3d6849" },
  { color: "#e8e4f0", textColor: "#5a4a7c" },
  { color: "#f0e8e8", textColor: "#7c4a4a" },
  { color: "#e4edf5", textColor: "#2c5f8a" },
  { color: "#f5f0e3", textColor: "#7a6832" },
];

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(p => /^[A-Z]/.test(p))
    .slice(0, 2)
    .map(p => p[0])
    .join("");
}

function buildPTUrl(location: string, issues: string[]): string {
  const base = "https://www.psychologytoday.com/us/therapists";
  const params = new URLSearchParams({ category: "therapists", ref: "1" });

  if (issues.length > 0) {
    const issueMap: Record<string, string> = {
      anxiety: "1",
      depression: "2",
      trauma: "43",
      stress: "40",
      grief: "15",
      relationships: "35",
      adhd: "5",
      ocd: "26",
      burnout: "stress",
      "life transitions": "22",
      eating: "10",
    };
    const firstIssue = issues[0].toLowerCase();
    for (const [key, val] of Object.entries(issueMap)) {
      if (firstIssue.includes(key)) {
        params.append("spec[]", val);
        break;
      }
    }
  }

  if (location) {
    const parts = location.split(",").map(s => s.trim().toLowerCase());
    if (parts.length >= 2) {
      const city = parts[0].replace(/\s+/g, "-");
      const state = parts[1].replace(/\s+/g, "-");
      return `${base}/${state}/${city}?${params.toString()}`;
    } else if (parts.length === 1) {
      const slug = parts[0].replace(/\s+/g, "-");
      return `${base}/${slug}?${params.toString()}`;
    }
  }

  return `${base}?${params.toString()}`;
}

const MAX_RESULTS = 10;

async function scrapeTherapistsFromPT(
  location: string,
  issues: string[],
  modalities: string[],
  why_context: string
): Promise<TherapistCard[]> {
  const url = buildPTUrl(location, issues);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return [];

  const html = await response.text();
  const therapists: TherapistCard[] = [];

  // ── Strategy 1: Parse __NEXT_DATA__ JSON ────────────────────────────────────
  const nextMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (nextMatch) {
    try {
      const nextData = JSON.parse(nextMatch[1]);
      const candidates = [
        nextData?.props?.pageProps?.therapistResults?.results,
        nextData?.props?.pageProps?.results,
        nextData?.props?.pageProps?.searchResults?.results,
        nextData?.props?.pageProps?.initialData?.results,
      ];

      for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length > 0) {
          const limit = Math.min(candidate.length, MAX_RESULTS);
          for (let i = 0; i < limit; i++) {
            const t = candidate[i];
            const name =
              t?.full_name ||
              t?.name ||
              t?.displayName ||
              (t?.firstName && t?.lastName
                ? `${t.firstName} ${t.lastName}`
                : null);
            if (!name) continue;

            const credentials = t?.credentials || t?.license || t?.degree || "";
            const title = [
              t?.title || t?.licenseType || credentials,
              modalities[0] ? `· ${modalities[0]}` : "",
            ]
              .filter(Boolean)
              .join(" ")
              .trim();

            const specialty = (
              t?.primarySpecialty ||
              t?.issues?.[0] ||
              t?.specialties?.[0] ||
              issues[0] ||
              "therapy"
            );
            const profileSlug = t?.slug || t?.profile_slug || "";
            const profileUrl = profileSlug
              ? `https://www.psychologytoday.com/us/therapists/${profileSlug}`
              : url;

            // Extract photo URL from various possible fields
            const photoUrl: string | undefined =
              t?.photo?.url ||
              t?.photoUrl ||
              t?.image?.url ||
              t?.avatar?.url ||
              t?.profile_image ||
              (typeof t?.photo === "string" ? t.photo : undefined) ||
              undefined;

            const fits: string[] = [];
            if (t?.telehealth || t?.virtual) fits.push("Telehealth available");
            if (t?.acceptsInsurance || t?.insurance) fits.push("Accepts insurance");
            if (t?.slidingScale) fits.push("Sliding scale available");
            if (t?.inPerson || t?.officeLocation) fits.push("In-person sessions");
            fits.push("Verified Psychology Today listing");
            if (fits.length < 3) fits.unshift(`Specializes in ${specialty}`);

            const palette = CARD_COLORS[i % CARD_COLORS.length];
            therapists.push({
              name,
              title: title || "Licensed Therapist",
              initials: toInitials(name),
              ...palette,
              score: `${95 - i * 2}% match`,
              why: `Has experience supporting ${why_context || issues[0] || "people like you"}.`,
              fits: fits.slice(0, 4),
              profileUrl,
              photoUrl,
            });
          }
          if (therapists.length > 0) return therapists;
        }
      }
    } catch {
      // Fall through to HTML parsing
    }
  }

  // ── Strategy 2: Cheerio HTML parsing ────────────────────────────────────────
  const $ = cheerio.load(html);

  const selectors = [
    ".results-row-info",
    "[data-qa='result-card']",
    ".profile-component-container",
    ".results-row",
  ];

  let found = false;
  for (const sel of selectors) {
    const els = $(sel);
    if (els.length === 0) continue;
    found = true;

    els.each((i, el) => {
      if (i >= MAX_RESULTS) return false as any;

      const $el = $(el);
      const name =
        $el.find(".profile-title a, h2, h3, [data-qa='therapist-name']").first().text().trim() ||
        $el.find("a").first().text().trim();
      if (!name) return;

      const title =
        $el.find(".profile-subtitle, .credentials, [data-qa='credentials']").first().text().trim() ||
        (modalities[0] ? `Licensed Therapist · ${modalities[0]}` : "Licensed Therapist");

      const blurb =
        $el.find(".profile-blurb, .statement-snippet, [data-qa='statement']").first().text().trim();
      const profileHref =
        $el.find("a").first().attr("href") || "";
      const profileUrl = profileHref.startsWith("http")
        ? profileHref
        : profileHref
        ? `https://www.psychologytoday.com${profileHref}`
        : url;

      // Try to get photo from img src
      const photoUrl: string | undefined =
        $el.find("img[src*='profile'], img[src*='photo'], img[src*='therapist']").first().attr("src") ||
        $el.find("img").first().attr("src") ||
        undefined;

      const fits: string[] = [`Specializes in ${issues[0] || "your concerns"}`, "Verified Psychology Today listing"];
      if ($el.text().toLowerCase().includes("telehealth")) fits.push("Telehealth available");
      if ($el.text().toLowerCase().includes("insurance")) fits.push("Accepts insurance");
      if ($el.text().toLowerCase().includes("sliding")) fits.push("Sliding scale");

      const palette = CARD_COLORS[i % CARD_COLORS.length];
      therapists.push({
        name,
        title: title.slice(0, 60),
        initials: toInitials(name),
        ...palette,
        score: `${95 - i * 2}% match`,
        why: blurb
          ? blurb.slice(0, 100) + (blurb.length > 100 ? "…" : "")
          : `Has experience supporting people working through ${issues[0] || "these challenges"}.`,
        fits: fits.slice(0, 4),
        profileUrl,
        photoUrl,
      });
    });

    if (therapists.length > 0) return therapists;
    if (found) break;
  }

  return therapists;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/sage/chat", async (req, res): Promise<void> => {
  const parsed = SageChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { history, userMessage } = parsed.data;

  const messages =
    history.length === 0
      ? [
          {
            role: "user" as const,
            content:
              "[Begin. Introduce yourself briefly and warmly — 1–2 sentences max — then ask your first open question.]",
          },
        ]
      : history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

  if (userMessage) {
    messages.push({ role: "user" as const, content: userMessage });
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 450,
    system: SAGE_SYSTEM,
    messages,
  });

  const block = response.content[0];
  const reply = block.type === "text" ? block.text : "";
  const complete = reply.includes("[INTERVIEW_COMPLETE]");

  res.json({ reply, complete });
});

router.post("/sage/profile", async (req, res): Promise<void> => {
  const parsed = GenerateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { history } = parsed.data;
  const transcript = history
    .map((m) => `${m.role === "user" ? "User" : "Sage"}: ${m.content}`)
    .join("\n");

  // ── Step 1: Generate AI profile ──────────────────────────────────────────
  const profileResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: PROFILE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Conversation transcript:\n${transcript}\n\nGenerate the profile JSON now. Remember to include 6–10 therapist matches.`,
      },
    ],
  });

  const block = profileResponse.content[0];
  const raw =
    block.type === "text"
      ? block.text.replace(/```json\n?|```/g, "").trim()
      : "{}";

  let profile: any;
  try {
    profile = JSON.parse(raw);
  } catch {
    req.log.error({ raw }, "Failed to parse profile JSON");
    res.status(500).json({ error: "Failed to parse profile response" });
    return;
  }

  // ── Ensure every AI-generated therapist has a photo URL ─────────────────
  // Pravatar gives consistent, realistic portrait photos seeded by name.
  // Real PT-scraped therapists already have photoUrl set; this only fills gaps.
  if (Array.isArray(profile.therapists)) {
    profile.therapists = profile.therapists.map((t: any, i: number) => ({
      ...t,
      photoUrl:
        t.photoUrl ||
        `https://i.pravatar.cc/150?u=psyconnect-${encodeURIComponent((t.name || String(i)).trim())}`,
    }));
  }

  // ── Step 2: Attempt real therapist scraping from Psychology Today ────────
  const location: string = profile.searchLocation || "";
  const issues: string[] = Array.isArray(profile.searchIssues) ? profile.searchIssues : [];
  const modalities: string[] = Array.isArray(profile.therapeuticModalities) ? profile.therapeuticModalities : [];

  if (location && issues.length > 0) {
    try {
      const realTherapists = await scrapeTherapistsFromPT(
        location,
        issues,
        modalities,
        profile.name || ""
      );
      if (realTherapists.length >= 3) {
        req.log.info(
          { count: realTherapists.length, location },
          "Scraped real therapists from Psychology Today"
        );
        profile.therapists = realTherapists;
        profile.therapistsSource = "psychologytoday";
      }
    } catch (err) {
      req.log.warn({ err }, "Therapist scraping failed — using AI-generated matches");
    }
  }

  res.json(profile);
});

export default router;
