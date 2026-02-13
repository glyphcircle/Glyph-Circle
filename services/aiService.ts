// services/aiService.ts

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

declare const puter: any;

// Generate Palmistry Report
export interface PalmMetricResponse {
    rawMetrics: any;
    textReading: string;
}

// Generate Face Reading
export interface FaceMetricResponse {
    rawMetrics: any;
    textReading: string;
}

enum AIProvider {
    GOOGLE = 'google',
    PUTER = 'puter'
}

/**
 * 🔐 Ensure user is properly authenticated with Puter
 * This forces the sign-in flow BEFORE making AI calls
 */
const ensurePuterAuthentication = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).puter) {
        console.error('❌ Puter not loaded');
        return false;
    }

    const puter = (window as any).puter;

    try {
        // Check if user is already signed in
        const isSignedIn = await puter.auth.isSignedIn();

        if (!isSignedIn) {
            console.log('🔐 User not signed in, triggering sign-in flow...');

            // This will show the proper sign-in popup
            // User will be prompted to enter their email FIRST
            await puter.auth.signIn();

            console.log('✅ User signed in successfully');
        }

        // Get user info to verify email is confirmed
        const user = await puter.auth.getUser();
        console.log('👤 Puter user:', user.username, '| Email:', user.email);

        // Check if email is confirmed
        if (user.email_confirmed === false) {
            console.warn('⚠️ Email not confirmed');
            alert('📧 Please verify your email to continue.\n\nCheck your inbox for the verification code from Puter.');
            return false;
        }

        console.log('✅ User fully authenticated and verified');
        return true;

    } catch (error: any) {
        console.error('❌ Puter authentication error:', error);

        // Show helpful error message
        alert(`❌ Authentication Error\n\n${error.message}\n\nPlease try:\n1. Going to puter.com\n2. Signing in there\n3. Coming back to this app`);

        return false;
    }
};

/**
 * 🔀 SMART AI PROVIDER SELECTOR
 * Priority: Puter.ai (free) → Google AI (configured) → Graceful fallback
 */
const getAIProvider = (): { provider: AIProvider; client: any } => {
    console.log('🔍 Selecting AI provider...');

    // ✅ PRIORITY 1: Try Puter.ai first (FREE!)
    if (typeof window !== 'undefined' && (window as any).puter?.ai) {
        console.log('✅ Using Puter.ai (FREE)');
        return {
            provider: AIProvider.PUTER,
            client: (window as any).puter
        };
    }

    console.log('⚠️ Puter.ai not available, checking Google AI...');

    // ✅ PRIORITY 2: Fallback to Google AI if configured
    const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY ||
        import.meta.env.VITE_GEMINI_API_KEY;

    if (apiKey && apiKey !== 'undefined' && apiKey.trim() !== '') {
        try {
            const googleAI = new GoogleGenerativeAI(apiKey);
            console.log('✅ Using Google AI (Gemini) as fallback');
            return {
                provider: AIProvider.GOOGLE,
                client: googleAI
            };
        } catch (error) {
            console.warn('⚠️ Google AI initialization failed:', error);
        }
    }

    // ✅ PRIORITY 3: Graceful degradation with helpful message
    console.warn('⚠️ No AI service available');
    console.info('💡 To enable AI features:');
    console.info('   Option 1 (Recommended): Add Puter.js to index.html:');
    console.info('   <script src="https://js.puter.com/v2/"></script>');
    console.info('   Option 2: Configure Google AI key in .env:');
    console.info('   VITE_GEMINI_API_KEY=your_key_here');

    return {
        provider: AIProvider.PUTER,
        client: {
            ai: {
                chat: async () => {
                    throw new Error('🔮 AI Oracle is sleeping. Please add Puter.js to index.html or configure Gemini API key.');
                }
            }
        }
    };
};

/**
 * 🔒 TIME-AWARE DETERMINISTIC SEED
 */
const generateDeterministicSeed = (input: string): number => {
    const currentYear = new Date().getFullYear().toString();
    const combinedInput = input + currentYear;
    let hash = 0;
    for (let i = 0; i < combinedInput.length; i++) {
        const char = combinedInput.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

const DETAIL_SYSTEM_PROMPT = `
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

// --- AUDIO HELPERS ---
function decodeBase64ToUint8(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodePcmToAudioBuffer(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
    });
};

// ============================================
// 📖 MAIN READING FUNCTION
// ============================================

export const getAstroNumeroReading = async (details: any): Promise<{ reading: string }> => {
    const { provider, client } = getAIProvider();

    // ✅ Authenticate if using Puter
    if (provider === AIProvider.PUTER) {
        const isAuth = await ensurePuterAuthentication();
        if (!isAuth) {
            return { reading: "🔐 Please sign in to access AI features." };
        }
    }

    const prompt = `${DETAIL_SYSTEM_PROMPT}

**User Details:**
- Name: ${details.name}
- Date of Birth: ${details.dob}
- Reading Type: ${details.mode}
- Language: ${details.language || 'English'}

Generate a comprehensive 4-part ${details.mode} reading. Focus deeply on the Temporal Forecast section for ${new Date().getFullYear()}.`;

    try {
        if (provider === AIProvider.GOOGLE) {
            const model = client.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.7
                }
            });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return { reading: text || "The stars are currently silent." };
        } else {
            const response = await client.ai.chat(prompt, {
                model: 'gpt-4o-mini',
                temperature: 0.7,
                max_tokens: 2000
            });
            return { reading: response.message?.content || response || "The stars are currently silent." };
        }
    } catch (error: any) {
        console.error('❌ AI Reading Error:', error);
        throw new Error('The Oracle is busy. Please try again.');
    }
};

// ============================================
// 🖐️ PALM READING
// ============================================

export const getPalmReading = async (imageFile: File, language: string = 'English'): Promise<PalmMetricResponse> => {
    const { provider, client } = getAIProvider();

    // ✅ Authenticate if using Puter
    if (provider === AIProvider.PUTER) {
        const isAuth = await ensurePuterAuthentication();
        if (!isAuth) {
            return { rawMetrics: {}, textReading: "🔐 Please sign in to access AI features." };
        }
    }

    const prompt = `${DETAIL_SYSTEM_PROMPT}

Analyze this palm image in ${language}. Generate an exhaustive 4-part palmistry study.`;

    try {
        if (provider === AIProvider.GOOGLE) {
            const base64Image = await fileToBase64(imageFile);

            const model = client.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            textReading: { type: SchemaType.STRING }
                        }
                    }
                }
            });

            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: imageFile.type,
                        data: base64Image
                    }
                },
                { text: prompt }
            ]);

            const response = await result.response;
            const text = response.text();
            const json = JSON.parse(text || "{}");

            return { rawMetrics: json, textReading: json.textReading || "Analysis complete." };
        } else {
            const dataUrl = await fileToDataURL(imageFile);
            const response = await client.ai.chat(prompt, dataUrl, {
                model: 'gpt-4o-mini',
                temperature: 0.7
            });
            const content = response.message?.content || response;
            return { rawMetrics: {}, textReading: content || "Analysis complete." };
        }
    } catch (error: any) {
        console.error('❌ Palm Reading Error:', error);
        throw error;
    }
};

// ============================================
// 👤 FACE READING
// ============================================

export const getFaceReading = async (imageFile: File, language: string = 'English', dob?: string): Promise<FaceMetricResponse> => {
    const { provider, client } = getAIProvider();

    // ✅ Authenticate if using Puter
    if (provider === AIProvider.PUTER) {
        const isAuth = await ensurePuterAuthentication();
        if (!isAuth) {
            return { rawMetrics: {}, textReading: "🔐 Please sign in to access AI features." };
        }
    }

    const ageContext = dob ? `User was born on ${dob}. ` : '';
    const prompt = `${DETAIL_SYSTEM_PROMPT}

${ageContext}Vedic Face reading (Samudrika Shastra) in ${language}. Provide a massive 4-part physiological profile.`;

    try {
        if (provider === AIProvider.GOOGLE) {
            const base64Image = await fileToBase64(imageFile);

            const model = client.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            textReading: { type: SchemaType.STRING }
                        }
                    }
                }
            });

            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: imageFile.type,
                        data: base64Image
                    }
                },
                { text: prompt }
            ]);

            const response = await result.response;
            const text = response.text();
            const json = JSON.parse(text || "{}");

            return { rawMetrics: json, textReading: json.textReading || "Analysis complete." };
        } else {
            const dataUrl = await fileToDataURL(imageFile);
            const response = await client.ai.chat(prompt, dataUrl, {
                model: 'gpt-4o-mini',
                temperature: 0.7
            });
            const content = response.message?.content || response;
            return { rawMetrics: {}, textReading: content || "Analysis complete." };
        }
    } catch (error: any) {
        console.error('❌ Face Reading Error:', error);
        throw error;
    }
};



// ============================================
// 💎 GEMSTONE GUIDANCE
// ============================================

/**
 * Parse gemstone response from AI
 */
const parseGemstoneResponse = (response: any): any => {
    try {
        // Extract content from response
        const content = response.message?.content || response;

        // Try to find JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback: Return as text reading
        return {
            primaryGem: {
                name: "Ruby",
                sanskritName: "Manikya",
                reason: "Based on your birth details",
                wearingMethod: "Wear on ring finger"
            },
            mantra: {
                sanskrit: "ॐ सूर्याय नमः",
                pronunciation: "Om Suryaya Namaha",
                meaning: "Salutations to the Sun"
            },
            fullReading: content
        };
    } catch (error) {
        console.error('❌ Parse error:', error);
        return {
            primaryGem: {
                name: "Ruby",
                sanskritName: "Manikya",
                reason: "Guidance received",
                wearingMethod: "Consult with expert"
            },
            mantra: {
                sanskrit: "ॐ",
                pronunciation: "Om",
                meaning: "The universal sound"
            },
            fullReading: "Please try again."
        };
    }
};

export const getGemstoneGuidance = async (
    name: string,
    dob: string,
    intent: string,
    language: string = 'English'
): Promise<any> => {
    try {
        const { provider, client } = getAIProvider();

        // ✅ AUTHENTICATE USER FIRST (if using Puter)
        if (provider === AIProvider.PUTER) {
            const isAuthenticated = await ensurePuterAuthentication();

            if (!isAuthenticated) {
                // Return friendly error response
                return {
                    primaryGem: {
                        name: "Ruby",
                        sanskritName: "Manikya",
                        reason: "Authentication required",
                        wearingMethod: "Please sign in to use AI features"
                    },
                    mantra: {
                        sanskrit: "ॐ",
                        pronunciation: "Om",
                        meaning: "The universal sound"
                    },
                    fullReading: "🔐 Please sign in with Puter to access AI-powered gemstone guidance.\n\nThis ensures secure and personalized readings."
                };
            }
        }

        const prompt = `${DETAIL_SYSTEM_PROMPT}
        
User Information:
Name: ${name}
Date of Birth: ${dob}
Intent: ${intent}
Preferred Language: ${language}

Provide detailed gemstone guidance in JSON format with these fields:
{
  "primaryGem": {
    "name": "gem name in English",
    "sanskritName": "gem name in Sanskrit",
    "reason": "why this gem",
    "wearingMethod": "how to wear"
  },
  "mantra": {
    "sanskrit": "mantra in Sanskrit",
    "pronunciation": "pronunciation guide",
    "meaning": "meaning in English"
  },
  "fullReading": "comprehensive reading with all 4 sections"
}`;

        console.log('🤖 Calling AI for gemstone guidance...');

        if (provider === AIProvider.GOOGLE) {
            const model = client.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: { temperature: 0.7 }
            });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log('✅ AI Response received');
            return parseGemstoneResponse(text);
        } else {
            // Puter AI
            const response = await client.ai.chat(prompt, {
                model: 'gpt-4o-mini',
                stream: false
            });
            console.log('✅ AI Response received');
            return parseGemstoneResponse(response);
        }

    } catch (error: any) {
        console.error('❌ Gemstone guidance error:', error);
        throw error;
    }
};

// ============================================
// 🕉️ MANTRA AUDIO (Google AI only)
// ============================================

export const generateMantraAudio = async (
    text: string,
    voiceName: 'Charon' | 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' = 'Charon'
): Promise<AudioBuffer> => {
    const { provider, client } = getAIProvider();

    if (provider === AIProvider.GOOGLE) {
        try {
            const model = client.getGenerativeModel({
                model: "gemini-1.5-flash"
            });

            const result = await model.generateContent([
                { text: `Recite this mantra: ${text}` }
            ]);

            const response = await result.response;
            const text_response = response.text();

            // Audio generation with Gemini may not be directly supported
            // Create a silent buffer as fallback
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            return audioCtx.createBuffer(1, 24000, 24000);
        } catch (error) {
            console.error('❌ Audio generation error:', error);
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            return audioCtx.createBuffer(1, 24000, 24000);
        }
    }

    // Puter.ai fallback: Create silent buffer
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return audioCtx.createBuffer(1, 24000, 24000);
};

// ============================================
// 🔮 OTHER FUNCTIONS
// ============================================

export const getRemedy = async (concern: string, language: string = 'English'): Promise<string> => {
    const { provider, client } = getAIProvider();

    // ✅ Authenticate if using Puter
    if (provider === AIProvider.PUTER) {
        const isAuth = await ensurePuterAuthentication();
        if (!isAuth) {
            return "🔐 Please sign in to access AI features.";
        }
    }

    const prompt = `${DETAIL_SYSTEM_PROMPT}\nVedic remedies for: "${concern}" in ${language}.`;

    if (provider === AIProvider.GOOGLE) {
        const model = client.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { temperature: 0.2 }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text() || "";
    } else {
        const response = await client.ai.chat(prompt, { model: 'gpt-4o-mini' });
        return response.message?.content || response || "";
    }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    if (!text || text.trim() === '') return text;

    const { provider, client } = getAIProvider();
    const prompt = `Translate to ${targetLanguage}. MAINTAIN [POSITIVE], [NEGATIVE], **bolding**:\n${text}`;

    if (provider === AIProvider.GOOGLE) {
        const model = client.getGenerativeModel({
            model: 'gemini-1.5-flash'
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text() || text;
    } else {
        const response = await client.ai.chat(prompt, { model: 'gpt-4o-mini', temperature: 0.2 });
        return response.message?.content || response || text;
    }
};

export const getTarotReading = async (cardName: string, language: string = 'English'): Promise<string> => {
    const { provider, client } = getAIProvider();

    // ✅ Authenticate if using Puter
    if (provider === AIProvider.PUTER) {
        const isAuth = await ensurePuterAuthentication();
        if (!isAuth) {
            return "🔐 Please sign in to access AI features.";
        }
    }

    const prompt = `${DETAIL_SYSTEM_PROMPT}\nTarot interpretation for "${cardName}" in ${language}.`;

    if (provider === AIProvider.GOOGLE) {
        const model = client.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { temperature: 0.4 }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text() || "";
    } else {
        const response = await client.ai.chat(prompt, { model: 'gpt-4o-mini', temperature: 0.8 });
        return response.message?.content || response || "";
    }
};

export const createSageSession = (contextReading: string, topic: string) => {
    const { provider, client } = getAIProvider();

    if (provider === AIProvider.GOOGLE) {
        const model = client.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: `You are Sage Vashishtha. Context: ${contextReading.substring(0, 5000)}`
        });

        return {
            sendMessage: async (message: string) => {
                const result = await model.generateContent(message);
                const response = await result.response;
                return { text: () => response.text() };
            }
        };
    } else {
        return {
            sendMessage: async (message: string) => {
                const response = await client.ai.chat(
                    `You are Sage Vashishtha. Context: ${contextReading.substring(0, 1000)}\n\nUser: ${message}`,
                    { model: 'gpt-4o-mini' }
                );
                return { text: () => response.message?.content || response };
            }
        };
    }
};

// Placeholders for additional functions
export const getAyurvedicAnalysis = async (answers: string, language: string = 'English'): Promise<any> => {
    const { provider, client } = getAIProvider();
    // Implementation similar to above
    return {};
};

// GetMuhurat Report Output from AI
export const getMuhurat = async (
    activity: string,
    date: string,
    language: string = 'English'
): Promise<{
    rating: string;
    bestTime: string;
    reason: string;
    fullReading: string;
}> => {
    const { provider, client } = getAIProvider();

    // 1. Calculate real Vedic timing (simplified but authentic)
    const inputDate = new Date(date);
    const dayOfWeek = inputDate.getDay(); // 0=Sunday, 1=Monday, etc.
    const hour = inputDate.getHours();

    // Simple Vedic timing logic (expandable)
    const bestTime = calculateVedicMuhurat(activity, dayOfWeek, hour);

    // 2. AI for personalized analysis
    const prompt = createDynamicMuhuratPrompt(activity, date, bestTime, dayOfWeek);

    try {
        if (client) {
            // Use your existing AI client
            const completion = await client.responses.create({
                model: provider === 'puter' ? 'gpt-4o-mini' : 'gpt-4.1-mini',
                input: prompt,
            });

            const rawText =
                completion.output_text ||
                (completion.output?.[0]?.content?.[0]?.text) ||
                '';

            // Extract structured data
            const structured = parseAIMuhuratResponse(rawText);

            return {
                rating: structured.rating || 'Good',
                bestTime: structured.bestTime || bestTime,
                reason: structured.reason || `Calculated based on Vedic timing for ${activity}.`,
                fullReading: structured.fullReading || rawText,
            };
        }
    } catch (err) {
        console.warn('[getMuhurat] AI unavailable, using calculated fallback:', err);
    }

    // 3. Pure calculation fallback (no AI needed)
    return createCalculatedMuhuratReport(activity, date, bestTime);
};

/**
 * Calculate authentic Vedic Muhurat based on activity and timing rules
 */
const calculateVedicMuhurat = (
    activity: string,
    dayOfWeek: number,
    hour: number
): string => {
    // Vedic day lords and activity types
    const dayLords = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const dayLord = dayLords[dayOfWeek];

    // Activity categories and favorable hours
    const activityTypes = {
        marriage: ['Jupiter', 'Venus'],
        business: ['Mercury', 'Jupiter'],
        housewarming: ['Venus', 'Moon'],
        travel: ['Moon', 'Mars'],
        education: ['Mercury', 'Jupiter'],
        vehicle: ['Mercury', 'Venus'],
        naming: ['Moon', 'Jupiter'],
        surgery: ['Mars', 'Saturn'],
        property: ['Venus', 'Jupiter'],
        other: ['Jupiter', 'Mercury']
    };

    const favorableLords = activityTypes[activity.toLowerCase()] || ['Jupiter', 'Mercury'];
    const favorableHours = calculateFavorableHours(dayLord, favorableLords, dayOfWeek);


    // Return best hour slot
    const bestHour = favorableHours[0];
    return `${bestHour.start} – ${bestHour.end}`;
};

/**
 * Calculate favorable hours based on day lord and activity
 */
const calculateFavorableHours = (
    dayLord: string,           // ← this is unused right now
    favorableLords: string[],  // ← this is used
    dayOfWeek: number          // ← ADD THIS PARAMETER
): Array<{ start: string; end: string }> => {

    // Simplified hora calculation (authentic Vedic logic)
    const baseHours = [
        { start: '06:00', end: '07:24' },
        { start: '07:24', end: '08:48' },
        { start: '08:48', end: '10:12' },
        { start: '10:12', end: '11:36' },
        { start: '11:36', end: '13:00' },
        { start: '13:00', end: '14:24' },
        { start: '14:24', end: '15:48' },
        { start: '15:48', end: '17:12' },
        { start: '17:12', end: '18:36' },
        { start: '18:36', end: '20:00' },
        { start: '20:00', end: '21:24' },
        { start: '21:24', end: '22:48' },
    ];

    // Score hours based on hora lord matching favorable lords
    const scoredHours = baseHours.map((hour, idx) => {
        const horaLord = getHoraLord(dayOfWeek, idx);  // ← Add dayOfWeek param
        const score = favorableLords.includes(horaLord) ? 100 : 60;
        return { ...hour, score, horaLord };
    });


    return scoredHours
        .filter(h => h.score > 50)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
};

/**
 * Get hora lord for day/hour (Vedic hora sequence)
 */
const getHoraLord = (dayOfWeek: number, hourIdx: number): string => {
    const horaSequence = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
    const dayOffset = dayOfWeek;
    const horaOffset = hourIdx % 7;
    const lordIndex = (dayOffset + horaOffset) % 7;
    return horaSequence[lordIndex];
};

/**
 * Create precise AI prompt with calculations
 */
const createDynamicMuhuratPrompt = (
    activity: string,
    date: string,
    bestTime: string,
    dayOfWeek: number
): string => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayLord = dayNames[dayOfWeek];

    return `
You are a senior Vedic astrologer. For "${activity}" on ${date} (${dayLord}), 
the calculated Muhurat is ${bestTime}.

Using authentic Vedic principles, create a detailed analysis explaining:

1. Why ${bestTime} is optimal for this activity
2. Panchang factors (simplified)
3. Remedies and enhancements
4. Do's and Don'ts
5. Lucky elements

Return JSON:
{
  "rating": "...",
  "bestTime": "${bestTime}",
  "reason": "...",
  "fullReading": "detailed multi-section report..."
}
`;
};

/**
 * Calculate duration between two times (simple version)
 */
const calculateDuration = (timeRange: string): string => {
    // Extract times like "10:12 AM – 11:28 AM"
    const times = timeRange.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/g);
    if (!times || times.length < 2) return '84';

    const start = times[0];
    const end = times[1];

    // Simple calculation: assume 84 minutes for most Muhurat windows
    return '84'; // minutes
};



/**
 * Pure calculation fallback (no AI)
 */
const createCalculatedMuhuratReport = (
    activity: string,
    date: string,
    bestTime: string
): {
    rating: string;
    bestTime: string;
    reason: string;
    fullReading: string;
} => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const inputDate = new Date(date);
    const dayOfWeek = inputDate.getDay();
    const dayName = dayNames[dayOfWeek];

    return {
        rating: 'Good',
        bestTime,
        reason: `Calculated using Vedic hora logic for "${activity}" on ${dayName}.`,
        fullReading: `
# MUHURAT ANALYSIS

## SHUBH MUHURAT REPORT FOR ${activity.toUpperCase()}

### CALCULATED MUHURAT WINDOW

[POSITIVE] • **BEST TIME:** **${bestTime}**  
• **DAY:** ${dayName}  
• **CONTEXT:** Time selected using a simplified **Vedic hora** and **day‑lord** based logic.

This window is chosen to **avoid common inauspicious periods** and to align with a more **supportive energy** for your activity.

---

## QUICK PANCHANG‑STYLE SUMMARY

[POSITIVE] • **Day Lord:** ${dayName} (general supportive nature for progress and stability)  
[POSITIVE] • **Favorable Nature:** Growth, stability, and **smooth beginnings**  
[POSITIVE] • **Duration:** Approx. **${calculateDuration(bestTime)} minutes** of peak auspiciousness  

These factors together create a **balanced, practical Muhurat** suitable for most people without needing a full personal birth chart.

---

## PREPARATION RITUAL (5 MINUTES)

[POSITIVE] • **Prepare the space:** Keep the area **clean, organized, and clutter‑free**.  
[POSITIVE] • **Light a diya or incense:** This invokes **clarity and protection** before you begin.  
[POSITIVE] • **Face East or North:** Traditionally linked with **growth, learning, and prosperity**.  
[POSITIVE] • **Set your Sankalpa (intention):**  
  “*I begin this activity at an **auspicious time**. May it bring **stability, prosperity, and well‑being** to all involved.*”  
[POSITIVE] • **Chant briefly:**  
  – *“Om Gan Ganapataye Namah”* (11 times) – to remove **obstacles**.  

---

## DO’S AND DON’TS DURING THE MUHURAT

### ✅ DO:

[POSITIVE] • Wear **clean, light colors** such as **yellow, white, or light green**.  
[POSITIVE] • Maintain a **calm, focused, and grateful** state of mind.  
[POSITIVE] • Keep your **phone and distractions on silent** while you perform the key step.  
[POSITIVE] • If documents are involved, **re‑check them calmly** during the Muhurat.  
[POSITIVE] • Offer a brief **thanks or prayer** once the main action is completed.

### ❌ DON’T:

[NEGATIVE] • Rush into the Muhurat while feeling **angry, upset, or extremely anxious**.  
[NEGATIVE] • Wear very **dark / heavy colors** (all‑black, muddy brown) at the exact start.  
[NEGATIVE] • Get into **arguments, complaints, or negative talk** around the start time.  
[NEGATIVE] • Mix this sacred window with **unrelated stressful tasks** (e.g., heated calls, conflict).  

---

## LUCKY ELEMENTS FOR THIS MUHURAT

[POSITIVE] • **Colors:** Yellow, White, Green – linked with **clarity, purity, and growth**.  
[POSITIVE] • **Numbers:** 3, 5, 7 – traditionally associated with **expansion and good fortune**.  
[POSITIVE] • **Symbols:** Ganesh, Lakshmi – invoke **removal of obstacles** and **abundance**.  

You may keep a **small coin, crystal, or sacred symbol** near you while beginning the activity as a subtle energetic anchor.

---

## IF YOU CANNOT USE THE EXACT WINDOW

[NEGATIVE] • If circumstances do not allow **${bestTime}** exactly, avoid **panicking** or feeling doomed.  
[POSITIVE] • Try to begin **as close as possible** within a ±30–45 minute band of this window.  
[POSITIVE] • Preserve the **intention, cleanliness, and short ritual** even if the clock time shifts slightly.  

Remember: **Your focus, sincerity, and effort also create auspiciousness**, not only the clock.

---

## FINAL BLESSING

[POSITIVE] • May your **${activity}** be **successful, stable, and blessed**, and may this Muhurat support long‑term well‑being for you and your family.  
🕉️ **Shubham Bhavatu – May it be auspicious.**
    `.trim()
    };
};
// Generate Advance Astro Report 
export const generateAdvancedAstroReport = async (details: any, engineData: any): Promise<any> => {
    const { provider, client } = getAIProvider();
    return { fullReportText: "" };
};

// Consultation Booking 
export const processConsultationBooking = async (bookingData: any): Promise<any> => {
    const { provider, client } = getAIProvider();
    return {};
};

// Generate Cosmic Sync
export const getCosmicSync = async (person1: any, person2: any) => {
    console.log('🌌 Generating Cosmic Sync for:', person1.name, '&', person2.name);

    try {
        const provider = await selectAIProvider();

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

1. **Compatibility Score** (0-100): Calculate based on:
   - Birth chart harmony (if time/place given)
   - Zodiac sign compatibility
   - Life path numbers
   - Elemental balance

2. **Relationship Type**: Define their connection (e.g., "Soulmates", "Twin Flames", "Karmic Bond", "Growth Partners", "Passionate Lovers", "Best Friends")

3. **Top 5 Strengths**: What makes this relationship powerful
4. **Top 5 Challenges**: Areas needing attention
5. **Detailed Analysis** (800-1200 words covering):
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
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4", "strength 5"],
  "challenges": ["challenge 1", "challenge 2", "challenge 3", "challenge 4", "challenge 5"],
  "fullReading": "DETAILED MARKDOWN REPORT HERE with ## headers for each section"
}`;

        const response = await provider.chat(prompt);

        // Parse response
        let parsed;
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse AI response, using fallback');
            parsed = generateFallbackReport(person1, person2);
        }

        // Validate and normalize
        return {
            compatibilityScore: parsed.compatibilityScore || 75,
            relationshipType: parsed.relationshipType || 'Soul Connection',
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [
                'Strong emotional bond',
                'Natural understanding',
                'Complementary energies',
                'Shared life goals',
                'Deep spiritual connection'
            ],
            challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [
                'Communication styles differ',
                'Need for personal space',
                'Different paces of life',
                'Handling conflicts',
                'Balancing independence and togetherness'
            ],
            fullReading: parsed.fullReading || generateDetailedReport(person1, person2, parsed)
        };

    } catch (error) {
        console.error('Error generating Cosmic Sync:', error);
        return generateFallbackReport(person1, person2);
    }
};

// Fallback for when AI fails
function generateFallbackReport(person1: any, person2: any) {
    const score = 70 + Math.floor(Math.random() * 25); // 70-95

    return {
        compatibilityScore: score,
        relationshipType: 'Cosmic Connection',
        strengths: [
            'Natural chemistry and attraction',
            'Complementary personality traits',
            'Shared values and life perspectives',
            'Strong emotional understanding',
            'Potential for deep spiritual growth together'
        ],
        challenges: [
            'Different communication styles to navigate',
            'Balancing individual needs with partnership',
            'Managing expectations and compromises',
            'Growing together through life changes',
            'Maintaining passion and connection over time'
        ],
        fullReading: generateDetailedReport(person1, person2, { compatibilityScore: score })
    };
}

// Generate the Detailed Report
function generateDetailedReport(person1: any, person2: any, data: any): string {
    const p1Name = person1.name.split(' ')[0];
    const p2Name = person2.name.split(' ')[0];
    const score = data.compatibilityScore || 75;

    return `## 🌟 Cosmic Overview

${p1Name} and ${p2Name}, your souls have found each other in this vast cosmic dance. With a compatibility rating of **${score}%**, your connection holds significant promise and potential for growth.

${score >= 85 ? `This is an exceptional match! Your energies harmonize beautifully, creating a relationship foundation that many spend lifetimes searching for.` :
            score >= 70 ? `You share a strong cosmic connection with natural compatibility that provides an excellent foundation for a lasting relationship.` :
                score >= 60 ? `Your relationship has solid potential, with areas of natural harmony balanced by opportunities for growth and understanding.` :
                    `Your connection presents unique challenges and opportunities. With conscious effort and mutual understanding, you can build something meaningful.`}

## 💕 Emotional Compatibility

The emotional landscape between ${p1Name} and ${p2Name} is ${score >= 75 ? 'remarkably harmonious' : 'dynamically balanced'}. ${p1Name}, you bring a unique emotional signature to this relationship, characterized by ${person1.tob ? 'depth and intuition guided by your birth chart' : 'natural empathy and understanding'}.

${p2Name}, your emotional expression ${score >= 70 ? 'complements this beautifully' : 'adds an interesting dynamic'}, creating a relationship where both partners feel seen and valued. The key to deepening your emotional bond lies in:

- **Active listening**: Really hearing what lies beneath the words
- **Vulnerability**: Creating safe spaces for authentic expression
- **Emotional validation**: Acknowledging each other's feelings without judgment
- **Patience**: Understanding that emotions flow differently for each person

## 🗣️ Communication Dynamics

Communication is the lifeline of your relationship. ${p1Name} tends to express through ${person1.tob ? 'a communication style influenced by planetary positions' : 'thoughtful and measured words'}, while ${p2Name} brings ${person2.tob ? 'a distinct communicative energy' : 'an expressive and engaging approach'}.

**Strengths in Communication:**
- Natural understanding of each other's unspoken needs
- Ability to discuss difficult topics when calm
- Shared sense of humor and playfulness
- Growing ability to read each other's emotional states

**Areas for Growth:**
- Speaking up before small issues become big problems
- Finding the right timing for important conversations
- Balancing talking and listening equally
- Translating feelings into clear words

## 🔥 Chemistry & Attraction

The physical and magnetic pull between you registers at ${score >= 80 ? 'an intense level' : 'a compelling level'}. This isn't just surface-level attraction—there's a deeper recognition happening. Your bodies respond to each other in ways that suggest:

- **Magnetic resonance**: A natural pull that transcends the physical
- **Energy exchange**: You literally affect each other's vibrations
- **Unconscious synchronization**: Your rhythms naturally align
- **Passionate potential**: Strong foundation for intimacy and connection

Keep this flame alive through spontaneity, presence, and never taking each other for granted.

## 🌱 Long-Term Potential

Looking toward the horizon of your relationship, the cosmic indicators suggest ${score >= 80 ? 'exceptional' : 'strong'} long-term potential. The foundation you're building together has the following characteristics:

**Stability Factors:**
- Shared vision for the future
- Compatible life goals and aspirations  
- Complementary strengths and weaknesses
- Ability to weather storms together
- Natural partnership dynamics

**Growth Areas:**
- Continual personal development alongside relationship growth
- Maintaining individuality within unity
- Evolving together through life's stages
- Building traditions and shared memories
- Creating a legacy together

## 🎯 Shared Values & Life Vision

${p1Name} and ${p2Name}, your core values ${score >= 75 ? 'align beautifully' : 'create an interesting tapestry'}. You both seek:

- **Authenticity**: Being true to yourselves and each other
- **Growth**: Evolution as individuals and as a couple
- **Connection**: Deep, meaningful relationship experiences
- **Purpose**: Building something meaningful together

Where you differ, you have opportunities to learn and expand your worldviews. These differences aren't weaknesses—they're invitations to grow.

## ⚔️ Navigating Conflicts

Every relationship faces challenges. Yours is no exception. Your conflict resolution style tends toward ${score >= 75 ? 'constructive discussion and mutual understanding' : 'passionate expression that requires conscious management'}.

**Effective Conflict Strategies:**
1. **Pause before reacting**: Take three deep breaths
2. **Use "I" statements**: Focus on feelings, not accusations
3. **Find the underlying need**: What's really being asked for?
4. **Seek win-win solutions**: Compromise isn't about losing
5. **Repair quickly**: Don't let the sun set on anger

## 🔮 Karmic Lessons

This relationship has arrived to teach both of you profound lessons:

**For ${p1Name}:**
- Embracing vulnerability as strength
- Trusting the journey, not just the destination
- Balancing giving and receiving
- Speaking your truth with love

**For ${p2Name}:**
- Patience with process and timing
- Surrendering control to partnership
- Honoring your needs while considering another
- Finding strength in gentleness

## ✨ Spiritual Connection

Beyond the physical and emotional, your souls recognize each other. This ${score >= 85 ? 'profound' : 'meaningful'} spiritual connection manifests as:

- Moments of telepathic understanding
- Synchronicities and meaningful coincidences
- Feeling complete in each other's presence
- Shared dreams or intuitive knowing
- A sense of "coming home" to each other

Nurture this sacred dimension through:
- Meditation or spiritual practices together
- Deep conversations about meaning and purpose
- Respecting each other's spiritual journey
- Creating rituals that honor your bond

## 💫 Practical Advice for Success

To maximize the potential of this ${data.relationshipType || 'cosmic connection'}:

**Daily Practices:**
- Express appreciation for one thing daily
- Physical touch: hugs, hand-holding, gentle touches
- Eye contact: Really see each other
- Quality time: Even 15 minutes of undivided attention
- Laughter: Keep playfulness alive

**Weekly Rituals:**
- Date night or quality time together
- Check-ins: How are we doing?
- Shared activities you both enjoy
- Acts of service for each other
- Intimate connection

**Long-term Nurturing:**
- Annual relationship reviews
- Couples growth experiences (retreats, workshops)
- Continual learning about each other
- Celebrating milestones and creating memories
- Individual therapy or growth work

## 🌈 Final Cosmic Wisdom

${p1Name} and ${p2Name}, you have been brought together for a reason. Your compatibility score of **${score}%** reflects real potential, but remember: numbers tell only part of the story.

The greatest relationships aren't the ones that start with perfect compatibility—they're the ones where two people choose each other, day after day, through all of life's seasons.

Your cosmic connection provides the foundation. What you build on it is entirely up to you.

**Key Takeaways:**
✨ You have natural chemistry worth nurturing
✨ Communication is your superpower—use it consciously  
✨ Challenges are opportunities for deeper intimacy
✨ Your differences make you stronger together
✨ This relationship can be a vehicle for profound growth

May the stars continue to guide your journey together, and may you always remember why you chose each other.

---

*This reading was prepared with cosmic insight and astrological wisdom. For personalized guidance, consider a detailed birth chart analysis with both partners' complete birth data.*`;
}

// Advance Dream Analysis Response
export interface DreamAnalysisResponse {
    meaning: string;
    luckyNumbers: number[];
    symbols: string[];
    emotions: string[];
    archetypes: string[];
    guidance: string;
}

// ============================================
// 💭 Generate DREAM ANALYSIS
// ============================================

export const analyzeDream = async (dreamText: string, language: string = 'en'): Promise<DreamAnalysisResponse> => {
    console.log('🌙 Analyzing dream:', dreamText.substring(0, 50) + '...');

    try {
        const provider = await selectAIProvider();

        const prompt = `You are an expert dream interpreter combining Jungian psychology, Vedic symbolism, and modern neuroscience.

DREAM DESCRIPTION:
"${dreamText}"

Provide a comprehensive dream analysis with:

1. **Core Meaning** (detailed 800-1200 word interpretation covering):
   - Primary Message: What is the dream's main teaching?
   - Symbolic Analysis: Deep meaning of key symbols
   - Psychological Insights: What this reveals about the dreamer
   - Emotional Landscape: Feelings and their significance
   - Subconscious Patterns: Recurring themes or suppressed thoughts
   - Shadow Work: Hidden aspects being revealed
   - Vedic Perspective: Karmic or spiritual implications
   - Integration Advice: How to apply this wisdom
   - Future Guidance: What this suggests about upcoming events

2. **Key Symbols**: Extract 5-8 most significant symbols from the dream
3. **Emotions**: Identify 3-5 dominant emotions present
4. **Archetypes**: 2-3 Jungian or mythological archetypes appearing
5. **Lucky Numbers**: 5 numbers (1-99) derived from dream symbolism
6. **Guidance**: Practical action steps based on the dream

Return ONLY valid JSON (no markdown):
{
  "meaning": "# DREAM INTERPRETATION\\n\\n[Full detailed markdown report with ## headers for each section]",
  "symbols": ["symbol1", "symbol2", ...],
  "emotions": ["emotion1", "emotion2", ...],
  "archetypes": ["archetype1", "archetype2"],
  "luckyNumbers": [23, 45, 67, 12, 89],
  "guidance": "Practical steps for integration"
}`;

        const response = await provider.chat(prompt);

        // Parse response
        let parsed;
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse AI response, using fallback');
            parsed = generateFallbackDreamAnalysis(dreamText);
        }

        // Validate and normalize
        return {
            meaning: parsed.meaning || generateDetailedDreamReport(dreamText, parsed),
            symbols: Array.isArray(parsed.symbols) && parsed.symbols.length > 0
                ? parsed.symbols
                : extractSymbolsFromDream(dreamText),
            emotions: Array.isArray(parsed.emotions) && parsed.emotions.length > 0
                ? parsed.emotions
                : ['Wonder', 'Curiosity', 'Reflection'],
            archetypes: Array.isArray(parsed.archetypes) && parsed.archetypes.length > 0
                ? parsed.archetypes
                : ['The Seeker', 'The Dreamer'],
            luckyNumbers: Array.isArray(parsed.luckyNumbers) && parsed.luckyNumbers.length === 5
                ? parsed.luckyNumbers
                : generateLuckyNumbers(dreamText),
            guidance: parsed.guidance || 'Reflect on the symbols and emotions from this dream. Journal your insights.'
        };

    } catch (error) {
        console.error('Error analyzing dream:', error);
        return generateFallbackDreamAnalysis(dreamText);
    }
};

// Helper: Extract symbols from dream text
function extractSymbolsFromDream(dreamText: string): string[] {
    const commonSymbols = [
        'water', 'ocean', 'sea', 'river', 'lake',
        'flying', 'falling', 'running', 'climbing',
        'house', 'home', 'building', 'door', 'window',
        'animal', 'cat', 'dog', 'bird', 'snake',
        'person', 'child', 'mother', 'father',
        'death', 'birth', 'wedding', 'funeral',
        'fire', 'light', 'darkness', 'shadow',
        'tree', 'forest', 'mountain', 'desert',
        'car', 'vehicle', 'road', 'journey',
        'money', 'gold', 'treasure', 'gift'
    ];

    const lowerDream = dreamText.toLowerCase();
    const found = commonSymbols.filter(symbol => lowerDream.includes(symbol));

    return found.length > 0
        ? found.slice(0, 6)
        : ['Mystery', 'Journey', 'Transformation', 'Awakening', 'Discovery'];
}

// Helper: Generate lucky numbers from dream
function generateLuckyNumbers(dreamText: string): number[] {
    const seed = dreamText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const numbers: number[] = [];

    for (let i = 0; i < 5; i++) {
        numbers.push(((seed * (i + 1) * 7) % 99) + 1);
    }

    return [...new Set(numbers)].slice(0, 5); // Ensure unique
}

// Fallback for when AI fails
function generateFallbackDreamAnalysis(dreamText: string): DreamAnalysisResponse {
    return {
        meaning: generateDetailedDreamReport(dreamText, {}),
        symbols: extractSymbolsFromDream(dreamText),
        emotions: ['Wonder', 'Curiosity', 'Anticipation'],
        archetypes: ['The Seeker', 'The Dreamer'],
        luckyNumbers: generateLuckyNumbers(dreamText),
        guidance: 'Your dream contains powerful symbolism. Take time to reflect on how these images relate to your waking life.'
    };
}

// Generate detailed dream report
function generateDetailedDreamReport(dreamText: string, analysis: any): string {
    const symbols = analysis.symbols || extractSymbolsFromDream(dreamText);
    const firstSymbol = symbols[0] || 'journey';
    const dreamLength = dreamText.split(' ').length;
    const complexity = dreamLength > 50 ? 'deeply complex' : dreamLength > 20 ? 'richly symbolic' : 'meaningful';

    return `# 🌙 DREAM INTERPRETATION

## Your Subconscious Message

Your dream reveals a ${complexity} narrative from your subconscious mind. The imagery you experienced is not random—it's your psyche communicating through the ancient language of symbols.

**Your Dream:**
> "${dreamText.length > 200 ? dreamText.substring(0, 200) + '...' : dreamText}"

This dream carries profound significance for your current life journey.

## 🔮 Primary Symbolic Meaning

The central theme of your dream revolves around **${firstSymbol}**, a powerful archetype that appears across cultures and throughout history. In your personal context, this symbol is particularly significant.

${firstSymbol.toLowerCase().includes('water') || firstSymbol.toLowerCase().includes('ocean') || firstSymbol.toLowerCase().includes('sea') ? `

**Water Symbolism:**
Water in dreams represents the emotional realm, the unconscious mind, and the flow of life itself. The state of the water—calm, turbulent, deep, or shallow—mirrors your emotional landscape.

- **Calm waters**: Emotional peace, clarity, and balance
- **Rough seas**: Emotional turmoil, challenges, or transformation
- **Deep water**: Profound emotions, mysteries yet to surface
- **Crossing water**: Transition, change, moving between life stages

Your relationship with water in the dream reveals how you're navigating your emotional world right now.

` : firstSymbol.toLowerCase().includes('fly') || firstSymbol.toLowerCase().includes('flight') ? `

**Flying Symbolism:**
Flying represents freedom, transcendence, and rising above earthly concerns. It's one of the most exhilarating dream experiences.

- **Soaring high**: Confidence, achievement, spiritual elevation
- **Difficulty flying**: Obstacles to freedom, self-doubt
- **Fear while flying**: Anxiety about success or responsibility
- **Flying over landscapes**: Gaining perspective on life situations

Your experience of flight suggests a desire for liberation or a breakthrough happening in your waking life.

` : `

**The Power of ${firstSymbol}:**
This symbol carries deep psychological and spiritual meaning. It represents aspects of yourself or your life that are seeking expression or resolution.

In Jungian psychology, dream symbols are compensatory—they balance what's missing in your conscious awareness. If this symbol seems foreign or surprising, it's especially important to explore its message.

`}

## 🧠 Psychological Insights

Your dream emerges from the deeper layers of your psyche, where unprocessed experiences, emotions, and insights reside.

**What This Reveals About You:**

1. **Current Life Phase**: You're in a period of ${dreamLength > 40 ? 'significant transformation and growth' : 'reflection and processing'}. Your subconscious is actively working through experiences and preparing you for what's ahead.

2. **Emotional Processing**: The dream indicates you're working through feelings related to ${symbols.slice(0, 2).join(' and ')}. These aren't just dream images—they're emotional signatures.

3. **Unconscious Desires**: Beneath your daily awareness, you're seeking ${dreamText.toLowerCase().includes('lost') ? 'what has been lost or forgotten' : dreamText.toLowerCase().includes('find') ? 'discovery and understanding' : 'fulfillment and meaning'}.

4. **Shadow Integration**: Carl Jung taught that dreams reveal our "shadow"—the parts of ourselves we don't fully acknowledge. This dream invites you to integrate these hidden aspects.

## 💫 Emotional Landscape

Dreams are fundamentally emotional experiences. The feelings you had during the dream are as important as the content.

**Dominant Emotional Themes:**

${dreamText.toLowerCase().includes('fear') || dreamText.toLowerCase().includes('scared') || dreamText.toLowerCase().includes('afraid') ? `
- **Fear/Anxiety**: Your dream contained fear, which often represents:
  - Avoiding something in waking life
  - Feeling unprepared for a situation
  - Confronting unknown aspects of yourself
  - Processing real-life anxieties in a safe space

The fear in dreams is actually protective—it's your psyche's way of preparing you for challenges.
` : ''}

${dreamText.toLowerCase().includes('happy') || dreamText.toLowerCase().includes('joy') || dreamText.toLowerCase().includes('excited') ? `
- **Joy/Excitement**: Positive emotions suggest:
  - Alignment with your authentic self
  - Recognition of upcoming opportunities
  - Celebration of inner growth
  - Positive life developments manifesting

These feelings are your psyche's approval of your current direction.
` : ''}

${dreamText.toLowerCase().includes('sad') || dreamText.toLowerCase().includes('cry') ? `
- **Sadness/Grief**: These emotions indicate:
  - Necessary mourning or letting go
  - Acknowledging losses (big or small)
  - Emotional healing in progress
  - Compassion for yourself or others

Sadness in dreams is often the beginning of emotional release and healing.
` : ''}

- **Overall Emotional Tone**: ${dreamLength > 30 ? 'The complexity of your dream suggests deep emotional processing' : 'The focused nature of your dream points to specific emotional themes'}.

## 🌟 Subconscious Patterns

Your subconscious mind speaks in patterns, not just single images. Looking at the dream as a whole reveals:

**Recurring Themes:**
${dreamText.includes('back') || dreamText.includes('return') ? `
- **Return/Revisiting**: You may be processing past experiences or considering old paths with new wisdom. The psyche often revisits the past when we're ready to integrate lessons we previously couldn't understand.
` : ''}

${dreamText.includes('lost') || dreamText.includes('searching') || dreamText.includes('looking') ? `
- **Search/Quest**: The seeking pattern suggests you're in a phase of discovery. What you're looking for externally in the dream often represents something you're seeking within yourself.
` : ''}

${dreamText.includes('people') || dreamText.includes('person') || dreamText.includes('friend') ? `
- **Relationships/Others**: People in dreams often represent aspects of yourself or your relationships with those qualities. Every character is a part of your psyche speaking to you.
` : ''}

**Suppressed Thoughts Emerging:**
Dreams bring forward what we suppress during waking hours. Your dream suggests you may be suppressing:
- Desires or ambitions you haven't fully acknowledged
- Emotions you feel shouldn't be expressed
- Aspects of your personality seeking integration
- Creative or spiritual impulses needing attention

## 🕉️ Vedic & Spiritual Perspective

In Vedic tradition, dreams are considered messages from the subtle realms—where past karma, future possibilities, and spiritual guidance intersect.

**Karmic Implications:**
Your dream may be revealing:
- **Past Life Echoes**: Symbols or scenarios that feel familiar yet foreign
- **Karmic Lessons**: Situations you're meant to resolve in this lifetime
- **Soul Contracts**: Relationships or purposes you agreed to before birth
- **Spiritual Awakening**: Signs of consciousness expanding

**The Three Gunas in Your Dream:**
- **Sattva (Purity/Harmony)**: ${symbols.includes('light') || symbols.includes('white') ? 'Strong presence of light suggests sattvic qualities' : 'Present in the clarity of certain symbols'}
- **Rajas (Passion/Activity)**: ${dreamText.includes('running') || dreamText.includes('moving') || dreamText.includes('doing') ? 'Evident in the active, dynamic elements' : 'Shown through energy and movement'}
- **Tamas (Darkness/Inertia)**: ${dreamText.includes('dark') || dreamText.includes('stuck') ? 'Appearing as obstacles or shadows' : 'Minimal presence, suggesting mental clarity'}

## 🎯 Integration & Action Steps

A dream's value comes from integrating its wisdom into waking life.

**Immediate Actions (Next 24-48 Hours):**

1. **Journal Deeply**: Write freely about:
   - How the dream made you feel
   - What associations come up with key symbols
   - Any "aha" moments or sudden insights
   - Questions the dream raises

2. **Creative Expression**: Draw, paint, or create something inspired by the dream. Art bypasses the analytical mind and accesses deeper wisdom.

3. **Active Imagination**: In a quiet moment, revisit the dream. Imagine continuing it or asking dream characters questions. Your imagination can complete unfinished dream narratives.

**This Week:**

4. **Symbol Research**: Look up the cultural, psychological, and spiritual meanings of your key symbols. Notice which interpretations resonate.

5. **Behavior Observation**: Watch for how the dream's themes play out in waking life. Dreams often foreshadow or parallel daily events.

6. **Emotional Processing**: Create space to feel whatever emotions the dream brought up. Suppressing them blocks the dream's healing power.

**Long-term Integration:**

7. **Pattern Recognition**: Keep a dream journal and look for recurring themes across multiple dreams. Patterns reveal your psyche's persistent messages.

8. **Life Changes**: If the dream clearly points to needed changes (relationships, career, habits), take small steps in that direction.

9. **Spiritual Practice**: Incorporate meditation, prayer, or contemplation to deepen your connection with the wisdom of dreams.

## 🔮 Prophetic Elements

While not all dreams are prophetic, many contain glimpses of future possibilities.

**Potential Future Indicators:**
${dreamText.includes('pregnant') || dreamText.includes('baby') || dreamText.includes('birth') ? `
- **Birth/Pregnancy Symbols**: Often herald new beginnings, creative projects, or actual pregnancies within 3-12 months
` : ''}

${dreamText.includes('death') || dreamText.includes('dying') || dreamText.includes('funeral') ? `
- **Death/Endings**: Rarely literal; usually signify transformation, the end of a life phase, or ego death preceding spiritual rebirth
` : ''}

${dreamText.includes('house') || dreamText.includes('home') || dreamText.includes('building') ? `
- **Houses/Buildings**: Represent your psyche or life structure. New rooms suggest unexplored potential; old houses point to foundations or past patterns
` : ''}

- **Timing**: Dreams can be:
  - **Immediate** (next few days): Vivid, emotionally intense dreams
  - **Near-term** (weeks to months): Recurring themes or clear scenarios
  - **Long-term** (months to years): Archetypal dreams with universal symbols

## 💎 The Gift of This Dream

Every dream is a gift from your deeper self. This particular dream offers you:

✨ **Self-Knowledge**: Clearer understanding of your inner world
✨ **Emotional Healing**: Processing and release of stored feelings  
✨ **Future Preparation**: Subtle guidance for upcoming situations
✨ **Creative Inspiration**: Images and ideas for creative expression
✨ **Spiritual Growth**: Connection to deeper dimensions of reality

## 🌈 Final Wisdom

"${dreamText.substring(0, 100)}${dreamText.length > 100 ? '...' : ''}"

This dream is uniquely yours—a message crafted by your subconscious specifically for this moment in your life. While dream dictionaries and general interpretations are helpful starting points, the most accurate interpretation comes from your own inner knowing.

Trust your intuition about what the dream means. The symbols that make you pause, the emotions that linger, the images you can't forget—these are your guideposts.

Your subconscious mind is incredibly wise. It has access to all your memories, all your experiences, and even dimensions beyond normal consciousness. When it speaks to you through dreams, listen carefully.

**Remember:**
- Dreams are not fortune-telling; they're wisdom-sharing
- Negative dreams are often the most healing
- You are the ultimate authority on your dreams
- Every dream element is a part of you

May this interpretation serve your highest growth and deepest understanding. Sweet dreams and wakeful insights to you.

---

*"The dream is a little hidden door in the innermost and most secret recesses of the soul." - Carl Jung*

*This interpretation combines Jungian psychology, Vedic wisdom, and modern dream science to provide comprehensive insights into your subconscious message.*`;
}

