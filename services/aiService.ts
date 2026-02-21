// ============================================================
// services/aiService.ts — PART 1: Infrastructure & Types
// ============================================================
// HOW THIS FILE IS ORGANIZED:
//   Part 1 → Types, interfaces, enums, AI provider setup,
//             authentication, shared utilities
//   Part 2 → AI service functions (AstroNumero → Gemstone)
//   Part 3 → AI service functions (Remedy → Dream) + fallbacks
//
// ✅ GOLDEN RULES for adding/editing any service function:
//   1. Always use callAI() helper — never call client.ai.chat() directly
//   2. Always parse JSON via parseJSON() helper
//   3. Always validate + normalize response before returning
//   4. Never remove the Google branch — always keep both providers
// ============================================================

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

declare const puter: any;

// ============================================================
// 📦 EXPORTED INTERFACES — One place for all response types
// ============================================================

/** Returned by getPalmReading() */
export interface PalmMetricResponse {
    rawMetrics: any;
    textReading: string;
}

/** Returned by getFaceReading() */
export interface FaceMetricResponse {
    rawMetrics: any;
    textReading: string;
}

/** Returned by analyzeDream() */
export interface DreamAnalysisResponse {
    meaning: string;
    luckyNumbers: number[];
    symbols: string[];
    emotions: string[];
    archetypes: string[];
    guidance: string;
}

// ============================================================
// 🔧 INTERNAL ENUM — AI Provider
// ============================================================

enum AIProvider {
    GOOGLE = 'google',
    PUTER = 'puter',
}

// ============================================================
// 🔐 PUTER AUTHENTICATION
// Forces sign-in BEFORE any AI call when using Puter.
// ============================================================

const ensurePuterAuthentication = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).puter) {
        console.error('❌ Puter not loaded');
        return false;
    }

    const puter = (window as any).puter;

    try {
        const isSignedIn = await puter.auth.isSignedIn();

        if (!isSignedIn) {
            console.log('🔐 User not signed in, triggering sign-in flow...');
            await puter.auth.signIn();
            console.log('✅ User signed in successfully');
        }

        const user = await puter.auth.getUser();
        console.log('👤 Puter user:', user.username, '| Email:', user.email);

        if (user.email_confirmed === false) {
            console.warn('⚠️ Email not confirmed');
            alert('📧 Please verify your email to continue.\n\nCheck your inbox for the verification code from Puter.');
            return false;
        }

        console.log('✅ User fully authenticated and verified');
        return true;

    } catch (error: any) {
        console.error('❌ Puter authentication error:', error);
        alert(`❌ Authentication Error\n\n${error.message}\n\nPlease try:\n1. Going to puter.com\n2. Signing in there\n3. Coming back to this app`);
        return false;
    }
};

// ============================================================
// 🔀 SMART AI PROVIDER SELECTOR
// Priority: Puter.ai (free) → Google AI → Stub fallback
// ============================================================

const getAIProvider = (): { provider: AIProvider; client: any } => {
    console.log('🔍 Selecting AI provider...');

    // ✅ PRIORITY 1: Puter.ai (FREE — no API key needed)
    if (typeof window !== 'undefined' && (window as any).puter?.ai) {
        console.log('✅ Using Puter.ai (FREE)');
        return { provider: AIProvider.PUTER, client: (window as any).puter };
    }

    console.log('⚠️ Puter.ai not available, checking Google AI...');

    // ✅ PRIORITY 2: Google Gemini (needs VITE_GEMINI_API_KEY in .env)
    const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY || import.meta.env.VITE_GEMINI_API_KEY;

    if (apiKey && apiKey !== 'undefined' && apiKey.trim() !== '') {
        try {
            const googleAI = new GoogleGenerativeAI(apiKey);
            console.log('✅ Using Google AI (Gemini) as fallback');
            return { provider: AIProvider.GOOGLE, client: googleAI };
        } catch (error) {
            console.warn('⚠️ Google AI initialization failed:', error);
        }
    }

    // ✅ PRIORITY 3: Stub — throws helpful error
    console.warn('⚠️ No AI service available');
    return {
        provider: AIProvider.PUTER,
        client: {
            ai: {
                chat: async () => {
                    throw new Error('🔮 AI Oracle is sleeping. Please add Puter.js to index.html or configure VITE_GEMINI_API_KEY in .env');
                },
            },
        },
    };
};

// ============================================================
// 🔧 CORE HELPER: callAI()
// ============================================================
// USE THIS instead of calling client.ai.chat() directly.
// Handles both providers, extracts content string, and
// throws if neither provider is available.
//
// Usage:
//   const raw = await callAI(prompt);           // text prompt
//   const raw = await callAI(prompt, imageUrl); // vision prompt
// ============================================================

const callAI = async (
    prompt: string,
    imageDataUrl?: string,  // optional: pass for vision/image requests
    temperature = 0.7
): Promise<string> => {
    const { provider, client } = getAIProvider();

    // ── GOOGLE GEMINI ────────────────────────────────────────
    if (provider === AIProvider.GOOGLE) {
        const model = client.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { temperature },
        });

        let result;
        if (imageDataUrl) {
            // Vision call: strip data URL prefix, send as inline image
            const base64 = imageDataUrl.split(',')[1];
            const mimeType = imageDataUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
            result = await model.generateContent([
                { inlineData: { data: base64, mimeType } },
                { text: prompt },
            ]);
        } else {
            result = await model.generateContent(prompt);
        }

        return result.response.text() || '';
    }

    // ── PUTER.AI ─────────────────────────────────────────────
    const isAuth = await ensurePuterAuthentication();
    if (!isAuth) throw new Error('Authentication required');

    let response;
    if (imageDataUrl) {
        // Puter vision: pass image as second argument
        response = await client.ai.chat(prompt, imageDataUrl, {
            model: 'gpt-4o-mini',
            temperature,
        });
    } else {
        response = await client.ai.chat(prompt, {
            model: 'gpt-4o-mini',
            temperature,
        });
    }

    return typeof response === 'string'
        ? response
        : response?.message?.content || '';
};

// ============================================================
// 🔧 CORE HELPER: parseJSON()
// ============================================================
// Safely extracts and parses the first JSON object from a
// string. Returns null if no valid JSON found.
// Always prefer this over direct JSON.parse().
// ============================================================

const parseJSON = <T = any>(raw: string): T | null => {
    try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]) as T;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

// ============================================================
// 🔧 FILE UTILITIES (used by Palm & Face reading)
// ============================================================

/** Converts a File to a base64 data URL (e.g. "data:image/jpeg;base64,...") */
export const fileToDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

/** Converts a File to raw base64 string (without the data URL prefix) */
export const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
    });

// ============================================================
// 🔢 DETERMINISTIC SEED (used in fallbacks for consistency)
// Changes once per year, so "random" outputs stay stable
// for the same input within the same year.
// ============================================================

export const generateDeterministicSeed = (input: string): number => {
    const combined = input + new Date().getFullYear().toString();
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash);
};

// ============================================================
// 📜 SHARED SYSTEM PROMPT (used by most text-only services)
// ============================================================

export const DETAIL_SYSTEM_PROMPT = `
ACT AS: A High Priest of Vedic Sciences with 50 years of experience.
TASK: Generate an IMPERIAL REPORT that is comprehensive, deeply detailed, and spans multiple sections.

FORMATTING RULES (STRICT):
1. NEVER output short responses. The user has paid for this; provide a MASTERPIECE.
2. STRUCTURE the report into exactly these 4 Sections using Markdown Headers (###):
   ### I. THE CELESTIAL ESSENCE (Introduction & Core Soul Purpose)
   ### II. THE ASTRAL CONFIGURATION (Detailed Planetary/Numerical breakdown)
   ### III. THE TEMPORAL FORECAST (Detailed predictions for ${new Date().getFullYear()})
   ### IV. THE SACRED REMEDIES (Detailed, actionable bullet points)
3. EVERY single insight must be a bullet point (starting with *).
4. USE [POSITIVE] at the start of a point for auspicious news.
5. USE [NEGATIVE] at the start of a point for warnings or challenges.
6. BOLD (using **) the most important 3-5 words in every single bullet point.
7. Language must be authoritative, ancient, and deeply mystical.
8. Ensure the text length is substantial (at least 600-800 words total).
`;
// ============================================================
// services/aiService.ts — PART 2: Service Functions 1–6
// ============================================================
// Services in this file:
//   1. getAstroNumeroReading   — Main astrology/numerology
//   2. getPalmReading          — Palm image analysis (vision)
//   3. getCosmicSync           — Compatibility analysis
//   4. getFaceReading          — Face image analysis (vision)
//   5. getGemstoneGuidance     — Gemstone recommendations
//   6. generateMantraAudio     — TTS audio (Google only)
// ============================================================

// ─────────────────────────────────────────────────────────────
// 1. 📖 ASTRO-NUMERO READING
// Used by: AstroNumerology page
// Returns: { reading: string } — long markdown report
// ─────────────────────────────────────────────────────────────

export const getAstroNumeroReading = async (
    details: any
): Promise<{ reading: string }> => {
    const prompt = `${DETAIL_SYSTEM_PROMPT}

**User Details:**
- Name: ${details.name}
- Date of Birth: ${details.dob}
- Reading Type: ${details.mode}
- Language: ${details.language || 'English'}

Generate a comprehensive 4-part ${details.mode} reading.
Focus deeply on the Temporal Forecast section for ${new Date().getFullYear()}.`;

    try {
        const raw = await callAI(prompt, undefined, 0.7);
        return { reading: raw || 'The stars are currently silent.' };
    } catch (error: any) {
        console.error('❌ AstroNumero Reading Error:', error);
        throw new Error('The Oracle is busy. Please try again.');
    }
};

// ─────────────────────────────────────────────────────────────
// 2. 🖐️ PALM READING (Vision — requires image)
// Used by: PalmReading page
// Returns: PalmMetricResponse { rawMetrics, textReading }
// ─────────────────────────────────────────────────────────────

export const getPalmReading = async (
    imageFile: File,
    language: string = 'English'
): Promise<PalmMetricResponse> => {
    const prompt = `You are an expert palmist. Analyze the palm in this image and provide a detailed reading in ${language}.

IMPORTANT: You MUST analyze the actual palm image provided.

Return ONLY valid JSON with no extra text:
{
  "textReading": "FORMATTED_READING_HERE",
  "rawMetrics": {
    "lines": {
      "heart":  { "clarity": 75, "length": 80, "depth": 70 },
      "head":   { "clarity": 85, "length": 75, "depth": 80 },
      "life":   { "clarity": 90, "length": 85, "depth": 85 },
      "fate":   { "clarity": 65, "length": 70, "depth": 60 }
    },
    "mounts": {
      "jupiter": 75, "saturn": 70, "apollo": 80,
      "mercury": 65, "venus": 85, "moon": 70,
      "mars_positive": 75, "mars_negative": 60
    }
  }
}

STRICT FORMATTING RULES for textReading:
- NEVER write paragraphs. Every single insight must be a bullet point.
- Start POSITIVE/auspicious points with: ✅
- Start NEGATIVE/warning points with: ❌
- Cover: Life Line, Head Line, Heart Line, Fate Line, all Mounts, Hand Shape, Fingers
- Minimum 12 bullet points total

Example:
✅ **Life Line** is deep and long, indicating strong vitality and excellent physical health.
❌ **Fate Line** is faint, suggesting the life path may be influenced by external circumstances.
✅ **Mount of Venus** is well-developed, reflecting warmth and loving relationships.`;

    try {
        const dataUrl = await fileToDataURL(imageFile);
        const raw = await callAI(prompt, dataUrl, 0.7);
        const parsed = parseJSON<PalmMetricResponse>(raw);

        if (parsed?.textReading) return parsed;

        // Fallback: return raw text with default metrics
        return {
            textReading: raw || 'Palm analysis complete.',
            rawMetrics: {
                lines: {
                    heart: { clarity: 75, length: 80, depth: 70 },
                    head: { clarity: 85, length: 75, depth: 80 },
                    life: { clarity: 90, length: 85, depth: 85 },
                    fate: { clarity: 65, length: 70, depth: 60 },
                },
                mounts: {
                    jupiter: 75, saturn: 70, apollo: 80,
                    mercury: 65, venus: 85, moon: 70,
                    mars_positive: 75, mars_negative: 60,
                },
            },
        };
    } catch (error) {
        console.error('❌ Palm reading error:', error);
        throw new Error('Failed to analyze palm. Please try again.');
    }
};

// ─────────────────────────────────────────────────────────────
// 3. 💞 COSMIC SYNC (Compatibility)
// Used by: CosmicSync page
// Returns: { compatibilityScore, relationshipType, strengths,
//            challenges, fullReading }
// ─────────────────────────────────────────────────────────────

export const getCosmicSync = async (person1: any, person2: any) => {
    console.log('🔮 Generating Cosmic Sync for', person1.name, '&', person2.name);

    const prompt = `You are an expert Vedic astrologer specializing in relationship compatibility analysis.

PERSON 1:
- Name: ${person1.name}
- Date of Birth: ${person1.dob}
${person1.tob ? `- Time of Birth: ${person1.tob}` : ''}
${person1.pob ? `- Place of Birth: ${person1.pob}` : ''}

PERSON 2:
- Name: ${person2.name}
- Date of Birth: ${person2.dob}
${person2.tob ? `- Time of Birth: ${person2.tob}` : ''}
${person2.pob ? `- Place of Birth: ${person2.pob}` : ''}

Create a comprehensive relationship compatibility analysis with:
1. Compatibility Score (0-100)
2. Relationship Type (e.g. Soulmates, Twin Flames, Karmic Bond, Growth Partners)
3. Top 5 Strengths of the relationship
4. Top 5 Challenges the couple will face
5. Detailed 800-1200 word Analysis covering:
   - Emotional Compatibility
   - Communication Styles
   - Physical Chemistry
   - Long-term Potential
   - Shared Values & Goals
   - Conflict Resolution Styles
   - Growth Opportunities
   - Karmic Lessons
   - Spiritual Connection
   - Practical Advice for Success

Return ONLY valid JSON (no markdown):
{
  "compatibilityScore": 85,
  "relationshipType": "Soulmates",
  "strengths": ["strength 1","strength 2","strength 3","strength 4","strength 5"],
  "challenges": ["challenge 1","challenge 2","challenge 3","challenge 4","challenge 5"],
  "fullReading": "DETAILED MARKDOWN REPORT with ### headers for each section"
}`;

    try {
        const raw = await callAI(prompt, undefined, 0.7);
        const parsed = parseJSON<any>(raw);

        if (!parsed) {
            console.warn('⚠️ CosmicSync: JSON parse failed, using fallback');
            return generateFallbackCosmicSync(person1, person2);
        }

        // Normalize — fill in defaults for any missing fields
        return {
            compatibilityScore: parsed.compatibilityScore ?? 75,
            relationshipType: parsed.relationshipType ?? 'Soul Connection',
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [
                'Strong emotional bond',
                'Natural understanding',
                'Complementary energies',
                'Shared life goals',
                'Deep spiritual connection',
            ],
            challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [
                'Communication styles differ',
                'Need for personal space',
                'Different paces of life',
                'Handling conflicts gracefully',
                'Balancing independence and togetherness',
            ],
            fullReading: parsed.fullReading ?? generateDetailedCosmicReport(person1, person2, parsed),
        };
    } catch (error) {
        console.error('❌ CosmicSync error:', error);
        return generateFallbackCosmicSync(person1, person2);
    }
};

// ─────────────────────────────────────────────────────────────
// 4. 👁️ FACE READING (Vision — requires image)
// Used by: FaceReading page
// Returns: FaceMetricResponse { rawMetrics, textReading }
// ─────────────────────────────────────────────────────────────

export const getFaceReading = async (
    imageFile: File,
    language: string = 'English',
    dob?: string
): Promise<FaceMetricResponse> => {
    const ageContext = dob ? `User was born on ${dob}.` : '';

    const prompt = `${DETAIL_SYSTEM_PROMPT}

${ageContext}
Perform a detailed Vedic Face Reading (Samudrika Shastra) in ${language}.
Analyze facial features: forehead, eyes, eyebrows, nose, lips, chin, ears, face shape.
Provide a massive 4-part physiological and personality profile.

Return JSON:
{
  "textReading": "FORMATTED READING with bullet points per feature"
}`;

    try {
        const dataUrl = await fileToDataURL(imageFile);
        const raw = await callAI(prompt, dataUrl, 0.7);

        // Try JSON parse first
        const parsed = parseJSON<{ textReading: string }>(raw);
        if (parsed?.textReading) {
            return { rawMetrics: parsed, textReading: parsed.textReading };
        }

        // Fallback: raw text is the reading
        return { rawMetrics: {}, textReading: raw || 'Analysis complete.' };
    } catch (error: any) {
        console.error('❌ Face Reading Error:', error);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────
// 5. 💎 GEMSTONE GUIDANCE
// Used by: GemstoneGuidance page
// Returns: { primaryGem, mantra, fullReading }
// ─────────────────────────────────────────────────────────────

/** Parses gemstone response — handles both string and object inputs */
const parseGemstoneResponse = (raw: any): any => {
    const content = typeof raw === 'string' ? raw : raw?.message?.content || '';
    const parsed = parseJSON<any>(content);

    if (parsed?.primaryGem) return parsed;

    // Fallback structure
    return {
        primaryGem: {
            name: 'Ruby',
            sanskritName: 'Manikya',
            reason: 'Based on your birth chart and planetary positions',
            wearingMethod: 'Wear on ring finger of right hand on Sunday morning',
        },
        mantra: {
            sanskrit: 'ॐ सूर्याय नमः',
            pronunciation: 'Om Suryaya Namaha',
            meaning: 'Salutations to the Sun',
        },
        fullReading: content || 'Please try again.',
    };
};

export const getGemstoneGuidance = async (
    name: string,
    dob: string,
    intent: string,
    language: string = 'English'
): Promise<any> => {
    const prompt = `${DETAIL_SYSTEM_PROMPT}

User Information:
- Name: ${name}
- Date of Birth: ${dob}
- Intent / Goal: ${intent}
- Preferred Language: ${language}

Provide detailed Vedic gemstone guidance. Return ONLY valid JSON:
{
  "primaryGem": {
    "name": "gem name in English",
    "sanskritName": "gem name in Sanskrit",
    "reason": "why this gem suits this person",
    "wearingMethod": "detailed how to wear instructions"
  },
  "secondaryGems": ["gem2", "gem3"],
  "gemsToAvoid": ["gem to avoid"],
  "mantra": {
    "sanskrit": "mantra in Sanskrit script",
    "pronunciation": "pronunciation guide",
    "meaning": "meaning in English"
  },
  "fullReading": "comprehensive 4-section report"
}`;

    try {
        const raw = await callAI(prompt, undefined, 0.7);
        return parseGemstoneResponse(raw);
    } catch (error: any) {
        console.error('❌ Gemstone guidance error:', error);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────
// 6. 🕉️ MANTRA AUDIO (Google AI only — TTS not in Puter)
// Used by: MantraPlayer component
// Returns: AudioBuffer (silent fallback if unavailable)
// ─────────────────────────────────────────────────────────────

export const generateMantraAudio = async (
    text: string,
    _voiceName: 'Charon' | 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' = 'Charon'
): Promise<AudioBuffer> => {
    // Always return a silent audio buffer
    // Gemini TTS is not yet stable — extend here when Google releases it
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return audioCtx.createBuffer(1, 24000, 24000);
};
// ============================================================
// services/aiService.ts — PART 3: Service Functions 7–end
//                         + All Fallback Generators
// ============================================================
// Services in this file:
//   7.  getRemedy              — Vedic remedy suggestions
//   8.  translateText          — Text translation
//   9.  getTarotReading        — Single card tarot reading
//   10. createSageSession      — Chat session with Sage AI
//   11. getAyurvedicAnalysis   — Dosha / Prakriti analysis
//   12. getMuhurat             — Auspicious timing analysis
//   13. analyzeDream           — Dream interpretation
//   14. generateAdvancedAstroReport — Advanced report (stub)
//   15. processConsultationBooking  — Booking (stub)
//
// Fallback generators (private):
//   - generateFallbackCosmicSync
//   - generateDetailedCosmicReport
//   - generateFallbackDreamAnalysis
//   - generateDetailedDreamReport
//   - extractSymbolsFromDream
//   - generateLuckyNumbers
//   - Muhurat helpers
// ============================================================

// ─────────────────────────────────────────────────────────────
// 7. 🌿 VEDIC REMEDY
// Used by: RemedyPage / chat widgets
// Returns: string — markdown formatted remedies
// ─────────────────────────────────────────────────────────────

export const getRemedy = async (
    concern: string,
    language: string = 'English'
): Promise<string> => {
    const prompt = `${DETAIL_SYSTEM_PROMPT}

Provide comprehensive Vedic remedies for the following concern: "${concern}"
Language: ${language}

Include: mantras, gemstones, colors, days, deities, rituals, dietary advice.`;

    try {
        const raw = await callAI(prompt, undefined, 0.4);
        return raw || '';
    } catch (error) {
        console.error('❌ Remedy error:', error);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────
// 8. 🌐 TEXT TRANSLATION
// Used by: LanguageContext / any service that needs translation
// Returns: translated string (falls back to original if fails)
// ─────────────────────────────────────────────────────────────

export const translateText = async (
    text: string,
    targetLanguage: string
): Promise<string> => {
    if (!text || text.trim() === '') return text;

    const prompt = `Translate the following text to ${targetLanguage}.
IMPORTANT: MAINTAIN all formatting markers: [POSITIVE], [NEGATIVE], and **bold** text.
Return ONLY the translated text, nothing else.

TEXT:
${text}`;

    try {
        const raw = await callAI(prompt, undefined, 0.2);
        return raw || text;
    } catch {
        return text; // Never throw — always return original as fallback
    }
};

// ─────────────────────────────────────────────────────────────
// 9. 🔮 TAROT READING
// Used by: TarotReading page
// Returns: string — full markdown tarot interpretation
// ─────────────────────────────────────────────────────────────

export const getTarotReading = async (
    cardName: string,
    language: string = 'English'
): Promise<string> => {
    const prompt = `${DETAIL_SYSTEM_PROMPT}

Provide a comprehensive Tarot card interpretation for: "${cardName}"
Language: ${language}

Cover: upright meaning, reversed meaning, symbolism, numerology, element,
astrology connection, Vedic parallel, and practical guidance for today.`;

    try {
        const raw = await callAI(prompt, undefined, 0.7);
        return raw || '';
    } catch (error) {
        console.error('❌ Tarot error:', error);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────
// 10. 🧙 SAGE SESSION (Stateful chat)
// Used by: SageChat component
// Returns: session object with sendMessage() method
// NOTE: Google uses native chat session; Puter simulates it
//       by injecting context into every message.
// ─────────────────────────────────────────────────────────────

export const createSageSession = (contextReading: string, topic: string) => {
    const { provider, client } = getAIProvider();
    const systemPrompt = `You are Sage Vashishtha, a wise and compassionate Vedic scholar.
Topic of consultation: ${topic}
Context from the reading:
${contextReading.substring(0, 5000)}

Respond in a wise, helpful, and mystical tone. Give practical advice grounded in Vedic wisdom.`;

    if (provider === AIProvider.GOOGLE) {
        const model = client.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt,
        });

        return {
            sendMessage: async (message: string) => {
                const result = await model.generateContent(message);
                const response = await result.response;
                return { text: () => response.text() };
            },
        };
    }

    // Puter: simulate session by injecting context into each call
    return {
        sendMessage: async (message: string) => {
            const fullPrompt = `${systemPrompt}\n\nUser: ${message}`;
            const response = await client.ai.chat(fullPrompt, {
                model: 'gpt-4o-mini',
            });
            const content = typeof response === 'string'
                ? response
                : response?.message?.content || '';
            return { text: () => content };
        },
    };
};

// ─────────────────────────────────────────────────────────────
// 11. 🌿 AYURVEDIC DOSHA ANALYSIS
// Used by: AyurvedaDosha page
// Returns: { dosha, breakdown, diet, fullReading }
// ─────────────────────────────────────────────────────────────

export const getAyurvedicAnalysis = async (
    answers: string,
    language: string = 'English'
): Promise<any> => {
    const prompt = `You are an expert Ayurvedic physician with 50 years of experience.

Based on these quiz answers:
${answers}

Analyze the Prakriti (constitution) and return ONLY valid JSON:
{
  "dosha": "Vata-Pitta",
  "breakdown": { "vata": 40, "pitta": 35, "kapha": 25 },
  "diet": [
    "Eat warm, oily, nourishing foods",
    "Avoid cold, dry, raw foods",
    "Favor sweet, sour, salty tastes",
    "Drink warm water and herbal teas",
    "Include ghee and sesame oil daily",
    "Eat at regular meal times"
  ],
  "fullReading": "A comprehensive 3-4 sentence summary in ${language}"
}

Rules:
- breakdown values must add up to exactly 100
- dosha must be one of: Vata, Pitta, Kapha, Vata-Pitta, Pitta-Kapha, Vata-Kapha, Balanced
- diet must have exactly 6 items
- fullReading must be 3-4 sentences in ${language}`;

    try {
        const raw = await callAI(prompt, undefined, 0.4);
        const parsed = parseJSON<any>(raw);

        if (!parsed) {
            console.warn('⚠️ Ayurveda: JSON parse failed');
            return null;
        }

        // Normalize breakdown to exactly 100
        if (parsed.breakdown) {
            const total = (parsed.breakdown.vata || 0) +
                (parsed.breakdown.pitta || 0) +
                (parsed.breakdown.kapha || 0);
            if (total !== 100) {
                const factor = 100 / total;
                parsed.breakdown.vata = Math.round(parsed.breakdown.vata * factor);
                parsed.breakdown.pitta = Math.round(parsed.breakdown.pitta * factor);
                parsed.breakdown.kapha = 100 - parsed.breakdown.vata - parsed.breakdown.pitta;
            }
        }

        return parsed;
    } catch (e) {
        console.error('❌ Ayurvedic analysis error:', e);
        return null;
    }
};

// ─────────────────────────────────────────────────────────────
// 12. ⏰ MUHURAT (Auspicious Timing)
// Used by: MuhuratFinder page
// Returns: { rating, bestTime, reason, fullReading }
// ─────────────────────────────────────────────────────────────

/** Vedic hora lord sequence */
const HORA_SEQUENCE = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];

/** Get hora lord for a given day index and hora slot index */
const getHoraLord = (dayOfWeek: number, hourIdx: number): string => {
    return HORA_SEQUENCE[(dayOfWeek + hourIdx) % 7];
};

/** Standard 84-min hora windows (from sunrise ~6am) */
const BASE_HORAS = [
    { start: '06:00', end: '07:24' }, { start: '07:24', end: '08:48' },
    { start: '08:48', end: '10:12' }, { start: '10:12', end: '11:36' },
    { start: '11:36', end: '13:00' }, { start: '13:00', end: '14:24' },
    { start: '14:24', end: '15:48' }, { start: '15:48', end: '17:12' },
    { start: '17:12', end: '18:36' }, { start: '18:36', end: '20:00' },
    { start: '20:00', end: '21:24' }, { start: '21:24', end: '22:48' },
];

/** Activity → favorable hora lords mapping */
const ACTIVITY_LORDS: Record<string, string[]> = {
    marriage: ['Jupiter', 'Venus'],
    business: ['Mercury', 'Jupiter'],
    housewarming: ['Venus', 'Moon'],
    travel: ['Moon', 'Mars'],
    education: ['Mercury', 'Jupiter'],
    vehicle: ['Mercury', 'Venus'],
    naming: ['Moon', 'Jupiter'],
    surgery: ['Mars', 'Saturn'],
    property: ['Venus', 'Jupiter'],
    other: ['Jupiter', 'Mercury'],
};

/** Returns top 3 favorable hora windows for the activity */
const calculateVedicMuhurat = (activity: string, dayOfWeek: number): string => {
    const favorableLords = ACTIVITY_LORDS[activity.toLowerCase()] || ACTIVITY_LORDS.other;

    const scored = BASE_HORAS.map((hora, idx) => ({
        ...hora,
        score: favorableLords.includes(getHoraLord(dayOfWeek, idx)) ? 100 : 60,
    }));

    const best = scored.sort((a, b) => b.score - a.score)[0];
    return `${best.start} – ${best.end}`;
};

export const getMuhurat = async (
    activity: string,
    date: string,
    language: string = 'English'
): Promise<{ rating: string; bestTime: string; reason: string; fullReading: string }> => {
    const inputDate = new Date(date);
    const dayOfWeek = inputDate.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    const bestTime = calculateVedicMuhurat(activity, dayOfWeek);

    const prompt = `You are a senior Vedic astrologer.
For the activity "${activity}" on ${date} (${dayName}), the calculated Muhurat window is: ${bestTime}.

Using authentic Vedic principles (Hora, Panchang, day lords), create a detailed analysis explaining:
1. Why ${bestTime} is optimal for "${activity}"
2. Panchang factors for this day
3. Rituals and preparations (5-minute ritual)
4. Do's and Don'ts during the Muhurat
5. Lucky elements (colors, numbers, symbols)
6. What to do if you can't use the exact window

Return ONLY valid JSON:
{
  "rating": "Excellent / Good / Moderate",
  "bestTime": "${bestTime}",
  "reason": "one sentence explanation",
  "fullReading": "detailed multi-section markdown report"
}`;

    try {
        const raw = await callAI(prompt, undefined, 0.5);
        const parsed = parseJSON<any>(raw);

        if (parsed?.fullReading) {
            return {
                rating: parsed.rating || 'Good',
                bestTime: parsed.bestTime || bestTime,
                reason: parsed.reason || `Optimal Vedic hora for ${activity} on ${dayName}.`,
                fullReading: parsed.fullReading,
            };
        }
    } catch (err) {
        console.warn('⚠️ Muhurat: AI unavailable, using calculated fallback:', err);
    }

    // ── Pure calculation fallback (no AI needed) ──────────────
    return {
        rating: 'Good',
        bestTime,
        reason: `Calculated using Vedic hora logic for "${activity}" on ${dayName}.`,
        fullReading: `
# MUHURAT ANALYSIS

## SHUBH MUHURAT FOR ${activity.toUpperCase()} — ${date}

### ✨ BEST TIME WINDOW
[POSITIVE] • **OPTIMAL MUHURAT:** **${bestTime}**
• **DAY:** ${dayName}
• **BASIS:** Vedic hora and day-lord calculation

---

### 📿 PREPARATION RITUAL (5 minutes before)
[POSITIVE] • **Clean the space:** Keep the area clean, organized, and clutter-free.
[POSITIVE] • **Light a diya or incense:** Invokes clarity and divine protection.
[POSITIVE] • **Face East or North:** Traditionally linked with growth and prosperity.
[POSITIVE] • **Set your Sankalpa (intention):** "I begin this activity at an auspicious time."
[POSITIVE] • **Chant:** *"Om Gan Ganapataye Namah"* (11 times) — removes obstacles.

---

### ✅ DO's
[POSITIVE] • Wear **clean, light colors** such as yellow, white, or light green.
[POSITIVE] • Maintain a **calm, focused, and grateful** state of mind.
[POSITIVE] • Keep **phone and distractions** on silent during the key action.

### ❌ DON'Ts
[NEGATIVE] • Don't rush in while feeling **angry, upset, or anxious**.
[NEGATIVE] • Avoid **all-black or dark heavy colors** at the exact start time.
[NEGATIVE] • Don't mix this window with **unrelated stressful tasks**.

---

### 🍀 LUCKY ELEMENTS
[POSITIVE] • **Colors:** Yellow, White, Green — clarity, purity, and growth.
[POSITIVE] • **Numbers:** 3, 5, 7 — expansion and good fortune.
[POSITIVE] • **Symbols:** Ganesh, Lakshmi — obstacle removal and abundance.

---

🕉️ **Shubham Bhavatu — May it be auspicious.**`.trim(),
    };
};

// ─────────────────────────────────────────────────────────────
// 13. 🌙 DREAM ANALYSIS
// Used by: DreamAnalysis page
// Returns: DreamAnalysisResponse
// ─────────────────────────────────────────────────────────────

export const analyzeDream = async (
    dreamText: string,
    language: string = 'en'
): Promise<DreamAnalysisResponse> => {
    console.log('🌙 Analyzing dream:', dreamText.substring(0, 50) + '...');

    const prompt = `You are an expert dream interpreter combining Jungian psychology, Vedic symbolism, and modern neuroscience.

DREAM DESCRIPTION: ${dreamText}

Provide a comprehensive dream analysis with:
1. Core Meaning (detailed 800-1200 word interpretation) covering:
   - Primary Message, Symbolic Analysis, Psychological Insights,
   - Emotional Landscape, Subconscious Patterns, Shadow Work,
   - Vedic Perspective, Integration Advice, Future Guidance
2. Key Symbols: 5-8 most significant symbols from the dream
3. Emotions: 3-5 dominant emotions present
4. Archetypes: 2-3 Jungian or mythological archetypes
5. Lucky Numbers: 5 numbers (1-99) derived from dream symbolism
6. Guidance: Practical action steps based on the dream

Return ONLY valid JSON (no markdown):
{
  "meaning": "FULL DETAILED MARKDOWN REPORT with ### headers",
  "symbols": ["symbol1", "symbol2"],
  "emotions": ["emotion1", "emotion2"],
  "archetypes": ["archetype1", "archetype2"],
  "luckyNumbers": [23, 45, 67, 12, 89],
  "guidance": "Practical steps for integration"
}`;

    try {
        const raw = await callAI(prompt, undefined, 0.7);
        const parsed = parseJSON<DreamAnalysisResponse>(raw);

        if (!parsed || !parsed.meaning) {
            console.warn('⚠️ Dream: JSON parse failed, using fallback');
            return generateFallbackDreamAnalysis(dreamText);
        }

        // Normalize — fill defaults for any missing fields
        return {
            meaning: parsed.meaning,
            symbols: Array.isArray(parsed.symbols) && parsed.symbols.length > 0 ? parsed.symbols : extractSymbolsFromDream(dreamText),
            emotions: Array.isArray(parsed.emotions) && parsed.emotions.length > 0 ? parsed.emotions : ['Wonder', 'Curiosity', 'Reflection'],
            archetypes: Array.isArray(parsed.archetypes) && parsed.archetypes.length > 0 ? parsed.archetypes : ['The Seeker', 'The Dreamer'],
            luckyNumbers: Array.isArray(parsed.luckyNumbers) && parsed.luckyNumbers.length >= 5 ? parsed.luckyNumbers : generateLuckyNumbers(dreamText),
            guidance: parsed.guidance || 'Reflect on the symbols and emotions from this dream. Journal your insights.',
        };
    } catch (error) {
        console.error('❌ Dream analysis error:', error);
        return generateFallbackDreamAnalysis(dreamText);
    }
};

// ─────────────────────────────────────────────────────────────
// 14. 📊 ADVANCED ASTRO REPORT (stub — extend as needed)
// ─────────────────────────────────────────────────────────────

export const generateAdvancedAstroReport = async (
    details: any,
    engineData: any
): Promise<any> => {
    // TODO: Implement full Kundali + Dasha + transit report here
    return { fullReportText: '' };
};

// ─────────────────────────────────────────────────────────────
// 15. 📅 CONSULTATION BOOKING (stub — extend as needed)
// ─────────────────────────────────────────────────────────────

export const processConsultationBooking = async (bookingData: any): Promise<any> => {
    // TODO: Implement booking confirmation logic
    return {};
};

// ============================================================
// 🛡️ FALLBACK GENERATORS
// Called when AI fails or parse errors occur.
// All private (not exported) — only used internally.
// ============================================================

// ── CosmicSync fallbacks ─────────────────────────────────────

function generateFallbackCosmicSync(person1: any, person2: any) {
    const score = 70 + Math.floor(Math.random() * 25); // 70–95
    return {
        compatibilityScore: score,
        relationshipType: 'Cosmic Connection',
        strengths: [
            'Natural chemistry and attraction',
            'Complementary personality traits',
            'Shared values and life perspectives',
            'Strong emotional understanding',
            'Potential for deep spiritual growth together',
        ],
        challenges: [
            'Different communication styles to navigate',
            'Balancing individual needs with partnership',
            'Managing expectations and compromises',
            'Growing together through life changes',
            'Maintaining passion and connection over time',
        ],
        fullReading: generateDetailedCosmicReport(person1, person2, { compatibilityScore: score }),
    };
}

function generateDetailedCosmicReport(person1: any, person2: any, data: any): string {
    const p1 = person1.name.split(' ')[0];
    const p2 = person2.name.split(' ')[0];
    const score = data.compatibilityScore || 75;

    return `## 🌟 Cosmic Overview

${p1} and ${p2}, your souls have found each other in this vast cosmic dance. With a compatibility rating of **${score}%**, your connection holds significant promise.

${score >= 85 ? 'This is an exceptional match — your energies harmonize beautifully.' :
            score >= 70 ? 'You share a strong cosmic connection with natural compatibility.' :
                score >= 60 ? 'Your relationship has solid potential with areas of natural harmony.' :
                    'Your connection presents unique growth opportunities.'}

## 💕 Emotional Compatibility

The emotional landscape between ${p1} and ${p2} is ${score >= 75 ? 'remarkably harmonious' : 'dynamically balanced'}. You bring unique emotional signatures that, when understood, create profound depth.

**Keys to emotional intimacy:**
- **Active listening** — hear what lies beneath the words
- **Vulnerability** — create safe spaces for authentic expression
- **Emotional validation** — acknowledge feelings without judgment
- **Patience** — emotions flow differently for each person

## 🗣️ Communication Dynamics

**Strengths:** Natural understanding, ability to discuss difficult topics, shared humor.

**Growth areas:** Speak up before small issues grow, balance talking and listening, translate feelings into clear words.

## 🔥 Chemistry & Attraction

The magnetic pull between you registers at ${score >= 80 ? 'an intense level' : 'a compelling level'}. Keep this alive through spontaneity and never taking each other for granted.

## 🌱 Long-Term Potential

Your foundation has **stability factors:** shared vision, compatible goals, complementary strengths. **Growth areas:** personal development alongside relationship growth, maintaining individuality within unity.

## ⚔️ Navigating Conflicts

1. **Pause before reacting** — take three deep breaths
2. **Use "I" statements** — focus on feelings, not accusations
3. **Find the underlying need** — what is really being asked for?
4. **Seek win-win solutions** — compromise isn't about losing
5. **Repair quickly** — don't let the sun set on anger

## 🔮 Karmic Lessons & Spiritual Connection

This relationship carries deep karmic significance. Your souls recognize each other — nurture this sacred dimension through shared practices, deep conversations, and respecting each other's spiritual journey.

## 💫 Practical Advice

**Daily:** Express appreciation, maintain physical affection, share quality time.
**Weekly:** Date nights, honest check-ins, shared activities.
**Long-term:** Annual relationship reviews, celebrate milestones, continue learning about each other.

---
*Your cosmic connection score of **${score}%** reflects real potential. What you build on it is entirely up to you.*`;
}

// ── Dream Analysis fallbacks ──────────────────────────────────

function extractSymbolsFromDream(dreamText: string): string[] {
    const known = [
        'water', 'ocean', 'sea', 'river', 'lake', 'flying', 'falling', 'running',
        'house', 'home', 'door', 'window', 'cat', 'dog', 'bird', 'snake', 'person',
        'child', 'mother', 'father', 'death', 'birth', 'fire', 'light', 'darkness',
        'tree', 'forest', 'mountain', 'car', 'road', 'money', 'gold', 'treasure',
    ];
    const lower = dreamText.toLowerCase();
    const found = known.filter(s => lower.includes(s));
    return found.length > 0 ? found.slice(0, 6) : ['Mystery', 'Journey', 'Transformation', 'Awakening', 'Discovery'];
}

function generateLuckyNumbers(dreamText: string): number[] {
    const seed = dreamText.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const nums = Array.from({ length: 5 }, (_, i) => ((seed * (i + 1) * 7) % 99) + 1);
    return [...new Set(nums)].slice(0, 5);
}

function generateFallbackDreamAnalysis(dreamText: string): DreamAnalysisResponse {
    return {
        meaning: generateDetailedDreamReport(dreamText, {}),
        symbols: extractSymbolsFromDream(dreamText),
        emotions: ['Wonder', 'Curiosity', 'Anticipation'],
        archetypes: ['The Seeker', 'The Dreamer'],
        luckyNumbers: generateLuckyNumbers(dreamText),
        guidance: 'Your dream contains powerful symbolism. Take time to reflect on how these images relate to your waking life.',
    };
}

function generateDetailedDreamReport(dreamText: string, analysis: any): string {
    const symbols = analysis.symbols || extractSymbolsFromDream(dreamText);
    const firstSymbol = symbols[0] || 'journey';
    const wordCount = dreamText.split(' ').length;
    const complexity = wordCount > 50 ? 'deeply complex' : wordCount > 20 ? 'richly symbolic' : 'meaningful';

    return `# 🌙 DREAM INTERPRETATION

## Your Subconscious Message

Your dream reveals a **${complexity}** narrative from your subconscious mind. The imagery you experienced is not random — it's your psyche communicating through the ancient language of symbols.

> *"${dreamText.length > 200 ? dreamText.substring(0, 200) + '...' : dreamText}"*

## 🔮 Primary Symbolic Meaning

The central theme revolves around **${firstSymbol}**, a powerful archetype that appears across cultures and throughout history.

## 🧠 Psychological Insights

1. **Current Life Phase**: You're in a period of ${wordCount > 40 ? 'significant transformation and growth' : 'reflection and processing'}.
2. **Emotional Processing**: Working through feelings related to ${symbols.slice(0, 2).join(' and ')}.
3. **Shadow Integration**: This dream invites you to integrate hidden aspects of yourself.

## 🌟 Subconscious Patterns

Your subconscious is actively processing experiences and preparing you for what's ahead. Pay attention to recurring elements — they are your psyche's persistent messages.

## 🕉️ Vedic & Spiritual Perspective

In Vedic tradition, dreams are messages from the subtle realms where past karma, future possibilities, and spiritual guidance intersect.

**Karmic Implications:**
- Past experiences seeking resolution
- Soul contracts and karmic lessons
- Spiritual awakening signals

## 🎯 Integration & Action Steps

**Immediate (24-48 hours):**
1. Journal deeply about the feelings and symbols
2. Notice how dream themes appear in waking life today
3. Sit quietly and revisit the dream with open curiosity

**This week:**
4. Research the cultural meanings of key symbols
5. Create space to process the emotions that lingered

## 💎 The Gift of This Dream

✨ Self-knowledge — clearer understanding of your inner world
✨ Emotional healing — processing and release of stored feelings
✨ Future preparation — subtle guidance for upcoming situations
✨ Spiritual growth — connection to deeper dimensions of reality

---
*"The dream is a little hidden door in the innermost and most secret recesses of the soul." — Carl Jung*`;
}
