
import { GoogleGenAI, Type, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAi = (): GoogleGenAI => {
  if (ai) return ai;
  if (!process.env.API_KEY) {
      throw new Error("The Cosmic Key is missing. Please check your environment.");
  }
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- AUDIO UTILS ---
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
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

export const generateMantraAudio = async (mantra: string): Promise<AudioBuffer> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say with deep spiritual resonance and calm pace: ${mantra}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Charon' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned from the Oracle.");

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decodedBytes = decodeBase64(base64Audio);
        return await decodeAudioData(decodedBytes, audioCtx, 24000, 1);
    } catch (e) {
        console.error("TTS Failed", e);
        throw e;
    }
};

export interface PalmMetricResponse {
    rawMetrics: any;
    textReading: string;
}

export interface FaceMetricResponse {
    rawMetrics: any;
    textReading: string;
}

export interface DreamAnalysisResponse {
    meaning: string;
    luckyNumbers: number[];
    symbols: string[];
}

export const createSageSession = (contextReading: string, topic: string) => {
    try {
        const ai = getAi();
        return ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: `You are Sage Vashishtha, an ancient Vedic Rishi and guide. User topic: ${topic}. Context: ${contextReading.substring(0, 5000)}`
            }
        });
    } catch (e) {
        throw new Error("Sage Vashishtha is currently in deep meditation. Try later.");
    }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Translate the following report into ${targetLanguage}. 
            Maintain all Markdown formatting (bolding, bullet points, headers) strictly. 
            Do not summarize, translate full text.
            
            Text to translate:
            ${text}`
        });
        return response.text || text;
    } catch (error) {
        console.error("Translation failed", error);
        return text; // Fallback to original
    }
};

export const getGemstoneGuidance = async (name: string, dob: string, intent: string, language: string = 'English'): Promise<any> => {
    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                primaryGem: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, sanskritName: { type: Type.STRING }, reason: { type: Type.STRING }, wearingMethod: { type: Type.STRING } } },
                mantra: { type: Type.OBJECT, properties: { sanskrit: { type: Type.STRING }, pronunciation: { type: Type.STRING }, meaning: { type: Type.STRING }, benefits: { type: Type.STRING } } },
                fullReading: { type: Type.STRING }
            },
            required: ["primaryGem", "mantra", "fullReading"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `User: ${name}, DOB: ${dob}, Intent: ${intent}. Recommend Gemstone & Mantra in ${language}.
            
            IMPORTANT FORMATTING INSTRUCTIONS for 'fullReading':
            1. The 'fullReading' field MUST be a detailed report formatted in Markdown with proper line breaks.
            2. Use **Bold** for key terms and headers.
            3. Use bullet points (-) for listing benefits, planetary effects, and ritual steps.
            4. Insert a double newline (\n\n) before every new Header (e.g., Planetary Analysis, Gemstone Benefits, Ritual Process, Caution).
            5. Structure the report strictly with clear sections.
            6. Ensure the tone is mystical yet practical.
            
            For 'primaryGem.reason', provide a concise 2-sentence summary suitable for a card display.
            `,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        throw new Error("Cosmic interference blocked the gemstone revelation.");
    }
};

export const getAyurvedicAnalysis = async (answers: string, language: string = 'English'): Promise<any> => {
    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                dosha: { type: Type.STRING, description: "Main Dosha (Vata, Pitta, Kapha or combinations)" },
                breakdown: { type: Type.OBJECT, properties: { vata: { type: Type.NUMBER }, pitta: { type: Type.NUMBER }, kapha: { type: Type.NUMBER } } },
                diet: { type: Type.ARRAY, items: { type: Type.STRING } },
                lifestyle: { type: Type.ARRAY, items: { type: Type.STRING } },
                fullReading: { type: Type.STRING }
            },
            required: ["dosha", "breakdown", "diet", "lifestyle", "fullReading"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze Ayurvedic Body Constitution based on these traits: ${answers}. 
            Provide result in ${language}. 
            For fullReading, provide a detailed MarkDown formatted report with headers, bold text, and bullet points covering Diet, Lifestyle, Yoga, and Mental Health.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        throw new Error("Dhanvantari is silent. Please try again.");
    }
};

export const getMuhurat = async (activity: string, date: string, language: string = 'English'): Promise<any> => {
    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                bestTime: { type: Type.STRING, description: "e.g., 10:30 AM - 12:00 PM" },
                rating: { type: Type.STRING, description: "Excellent, Good, Average, Avoid" },
                reason: { type: Type.STRING },
                fullReading: { type: Type.STRING }
            },
            required: ["bestTime", "rating", "reason", "fullReading"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Calculate Shubh Muhurat (Auspicious Time) for: "${activity}" on Date: "${date}". 
            Consider Choghadiya, Rahu Kaalam, and Hora. Output in ${language}.
            fullReading should be a MarkDown report explaining the planetary logic.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        throw new Error("Time is elusive. Try again.");
    }
};

export const getCosmicSync = async (p1: any, p2: any, language: string = 'English'): Promise<any> => {
    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                compatibilityScore: { type: Type.NUMBER, description: "0-100" },
                relationshipType: { type: Type.STRING, description: "e.g., Karmic Soulmates, Intellectual Rivals" },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
                fullReading: { type: Type.STRING }
            },
            required: ["compatibilityScore", "relationshipType", "strengths", "challenges", "fullReading"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze Synastry/Compatibility between:
            Person A: ${JSON.stringify(p1)}
            Person B: ${JSON.stringify(p2)}
            Language: ${language}.
            Provide a detailed astrological comparison. Full Report in MarkDown.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        throw new Error("The connection is cloudy.");
    }
};

export const getPalmReading = async (imageFile: File, language: string = 'English'): Promise<PalmMetricResponse> => {
  try {
    const ai = getAi();
    const base64Data = await fileToBase64(imageFile);
    const schema = {
      type: Type.OBJECT,
      properties: {
          handType: { type: Type.STRING },
          lines: { type: Type.OBJECT, properties: { life: { type: Type.OBJECT, properties: { length: { type: Type.NUMBER }, depth: { type: Type.NUMBER }, clarity: { type: Type.NUMBER }, breaks: { type: Type.NUMBER }, islands: { type: Type.NUMBER }, forks: { type: Type.NUMBER } } }, head: { type: Type.OBJECT, properties: { length: { type: Type.NUMBER }, depth: { type: Type.NUMBER }, clarity: { type: Type.NUMBER }, breaks: { type: Type.NUMBER }, islands: { type: Type.NUMBER }, forks: { type: Type.NUMBER } } }, heart: { type: Type.OBJECT, properties: { length: { type: Type.NUMBER }, depth: { type: Type.NUMBER }, clarity: { type: Type.NUMBER }, breaks: { type: Type.NUMBER }, islands: { type: Type.NUMBER }, forks: { type: Type.NUMBER } } }, fate: { type: Type.OBJECT, properties: { length: { type: Type.NUMBER }, depth: { type: Type.NUMBER }, clarity: { type: Type.NUMBER }, breaks: { type: Type.NUMBER }, islands: { type: Type.NUMBER }, forks: { type: Type.NUMBER } } }, sun: { type: Type.OBJECT, properties: { length: { type: Type.NUMBER }, depth: { type: Type.NUMBER }, clarity: { type: Type.NUMBER }, breaks: { type: Type.NUMBER }, islands: { type: Type.NUMBER }, forks: { type: Type.NUMBER } } } } },
          mounts: { type: Type.OBJECT, properties: { jupiter: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, firmness: { type: Type.NUMBER } } }, saturn: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, firmness: { type: Type.NUMBER } } }, apollo: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, firmness: { type: Type.NUMBER } } }, mercury: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, firmness: { type: Type.NUMBER } } }, venus: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, firmness: { type: Type.NUMBER } } }, moon: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, firmness: { type: Type.NUMBER } } }, mars: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, firmness: { type: Type.NUMBER } } } } },
          marks: { type: Type.ARRAY, items: { type: Type.STRING } },
          textReading: { type: Type.STRING }
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { mimeType: imageFile.type, data: base64Data } }, { text: `Vedic Palmistry analysis in ${language}. Full Report format with **bold** headers and bullet points.` }] },
      config: { responseMimeType: "application/json", responseSchema: schema }
    });
    const json = JSON.parse(response.text || "{}");
    return { rawMetrics: json, textReading: json.textReading || "Analysis complete." };
  } catch (error) {
    throw new Error("Spectral shadows blocked the line analysis.");
  }
};

export const getFaceReading = async (imageFile: File, language: string = 'English'): Promise<FaceMetricResponse> => {
    try {
        const ai = getAi();
        const base64Data = await fileToBase64(imageFile);
        const schema = {
            type: Type.OBJECT,
            properties: {
                forehead: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, width: { type: Type.NUMBER }, wrinkles: { type: Type.NUMBER }, shape: { type: Type.STRING } } },
                eyes: { type: Type.OBJECT, properties: { size: { type: Type.NUMBER }, spacing: { type: Type.STRING }, shape: { type: Type.STRING } } },
                nose: { type: Type.OBJECT, properties: { length: { type: Type.NUMBER }, width: { type: Type.NUMBER }, shape: { type: Type.STRING } } },
                cheeks: { type: Type.OBJECT, properties: { prominence: { type: Type.NUMBER } } },
                mouth: { type: Type.OBJECT, properties: { lipFullness: { type: Type.NUMBER } } },
                chin: { type: Type.OBJECT, properties: { shape: { type: Type.STRING }, prominence: { type: Type.NUMBER } } },
                jaw: { type: Type.OBJECT, properties: { strength: { type: Type.NUMBER }, type: { type: Type.STRING } } },
                symmetry: { type: Type.NUMBER },
                skin: { type: Type.OBJECT, properties: { texture: { type: Type.NUMBER } } },
                textReading: { type: Type.STRING }
            },
            required: ["forehead", "eyes", "nose", "cheeks", "mouth", "chin", "jaw", "symmetry", "skin", "textReading"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType: imageFile.type, data: base64Data } }, { text: `Vedic Face analysis in ${language}. Full Report format with **bold** headers and bullet points.` }] },
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        const json = JSON.parse(response.text || "{}");
        return { rawMetrics: json, textReading: json.textReading || "Analysis complete." };
    } catch (error) {
        throw new Error("The mystical lens is clouded. Retry face reading.");
    }
};

export const getAstroNumeroReading = async (details: any): Promise<{ reading: string }> => {
    try {
        const ai = getAi();
        
        let prompt = `Act as an expert Vedic Astrologer/Numerologist. Provide a detailed ${details.mode} reading for:
        Name: ${details.name}
        Date of Birth: ${details.dob}
        Language: ${details.language}`;

        if (details.mode === 'astrology') {
            prompt += `
            Time of Birth: ${details.tob}
            Place of Birth: ${details.pob}
            
            Provide a comprehensive Kundli analysis including:
            1. Ascendant & Moon Sign
            2. Planetary Positions (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu)
            3. Current Dasha Analysis
            4. Predictions for Career, Health, and Relationships.
            
            Format the output with clear headings and bullet points. Use bold text for key terms. Insert newlines for spacing.
            `;
        } else {
            prompt += `
            
            Provide a detailed Numerology report including:
            1. Life Path Number (Bhagyank) analysis
            2. Expression Number (Namank) analysis
            3. Soul Urge Number
            4. Personal Year Forecast
            
            Format the output with clear headings and bullet points. Insert newlines for spacing.
            `;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return { reading: response.text || "No response." };
    } catch (error) {
        throw new Error("Temporal interference detected during calculation.");
    }
};

export const getTarotReading = async (cardName: string, language: string = 'English'): Promise<string> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Tarot Master reading for "${cardName}" in ${language}. Provide a detailed interpretation with **Bold** headers and bullet points. Use newlines to separate sections.`,
        });
        return response.text || "No response.";
    } catch (error) {
        throw new Error("The spirits of the deck are restless. Try another draw.");
    }
};

export const getRemedy = async (concern: string, language: string = 'English'): Promise<string> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Vedic Guru remedies for: "${concern}" in ${language}. Provide clear bullet points and bold headers.`,
        });
        return response.text || "No response.";
    } catch (error) {
        throw new Error("The flow of guidance was interrupted by cosmic winds.");
    }
};

export const analyzeDream = async (dreamText: string, language: string = 'English'): Promise<DreamAnalysisResponse> => {
    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                meaning: { type: Type.STRING },
                luckyNumbers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                symbols: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["meaning", "luckyNumbers", "symbols"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Swapna Shastra expert interpretation of: "${dreamText}" in ${language}. Provide a detailed meaning with **Bold** headers and newlines.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        throw new Error("The dream mists are too thick to penetrate right now.");
    }
};
