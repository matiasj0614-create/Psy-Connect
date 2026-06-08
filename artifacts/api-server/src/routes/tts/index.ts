import { Router, type IRouter } from "express";
import { SynthesizeSpeechBody } from "@workspace/api-zod";

const router: IRouter = Router();

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

// ElevenLabs voice IDs
const EL_VOICES: Record<string, string> = {
  female: "EXAVITQu4vr4xnSDxMaL",
  male: "TX3LPaxmHKxFdv7VOQHJ",
};

// OpenAI voice names (warm, natural-sounding)
const OPENAI_VOICES: Record<string, string> = {
  female: "nova",
  male: "onyx",
};

async function tryElevenLabs(text: string, gender: string): Promise<Buffer | null> {
  if (!ELEVEN_LABS_API_KEY) return null;
  const voiceId = EL_VOICES[gender] ?? EL_VOICES.female;
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_LABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function tryOpenAI(text: string, gender: string): Promise<Buffer | null> {
  if (!OPENAI_BASE_URL || !OPENAI_API_KEY) return null;
  const voice = OPENAI_VOICES[gender] ?? OPENAI_VOICES.female;
  try {
    const response = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice,
        response_format: "mp3",
        speed: 0.95,
      }),
    });
    if (!response.ok) {
      // Try chat-completions with audio output as second OpenAI fallback
      return await tryOpenAIChat(text, gender);
    }
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return await tryOpenAIChat(text, gender);
  }
}

async function tryOpenAIChat(text: string, gender: string): Promise<Buffer | null> {
  if (!OPENAI_BASE_URL || !OPENAI_API_KEY) return null;
  const voice = OPENAI_VOICES[gender] ?? OPENAI_VOICES.female;
  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-audio-mini",
        modalities: ["text", "audio"],
        audio: { voice, format: "mp3" },
        messages: [
          {
            role: "system",
            content:
              "You are a text-to-speech assistant. Read the user's message aloud verbatim, naturally and warmly, without adding any commentary.",
          },
          { role: "user", content: text },
        ],
        max_completion_tokens: 4096,
      }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: Array<{ message?: { audio?: { data?: string } } }>;
    };
    const audioData = json.choices?.[0]?.message?.audio?.data;
    if (!audioData) return null;
    return Buffer.from(audioData, "base64");
  } catch {
    return null;
  }
}

router.post("/tts/synthesize", async (req, res): Promise<void> => {
  const parsed = SynthesizeSpeechBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { text, gender } = parsed.data;
  const resolvedGender = gender ?? "female";

  // Strip token markers and trim
  const cleanText = text.replace(/\[.*?\]/g, "").trim();
  if (!cleanText) {
    res.status(400).json({ error: "No text to synthesize" });
    return;
  }

  // Try ElevenLabs first (highest quality), then OpenAI
  let audioBuffer = await tryElevenLabs(cleanText, resolvedGender);
  let source = "elevenlabs";

  if (!audioBuffer) {
    req.log.warn("ElevenLabs unavailable, falling back to OpenAI TTS");
    audioBuffer = await tryOpenAI(cleanText, resolvedGender);
    source = "openai";
  }

  if (!audioBuffer) {
    req.log.error("All TTS providers failed");
    res.status(503).json({ error: "TTS synthesis unavailable" });
    return;
  }

  req.log.info({ source, chars: cleanText.length }, "TTS synthesized");
  res.json({
    audio: audioBuffer.toString("base64"),
    contentType: "audio/mpeg",
  });
});

export default router;
