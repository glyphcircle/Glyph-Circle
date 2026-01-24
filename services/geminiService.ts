
import { GoogleGenAI, Type, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

/**
 * 🌌 The Oracle Factory
 * Initializes the Gemini API using the environment variable API_KEY.
 */
const getAi = (): GoogleGenAI => {
  if (aiInstance) return aiInstance;
  
  // Fix: Adhere strictly to the initialization pattern from the coding guidelines
  aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return aiInstance;
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

export const generateMantraAudio = async (text: string, voiceName: 'Charon' | 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' = 'Charon'): Promise<AudioBuffer> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Recite this with deep, mystical resonance: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        // Fix: Adhere to the correct nested structure for prebuilt voice configuration
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        if (!response.candidates || response.candidates.length === 0) {
            throw new Error("The Oracle is currently in silence.");
        }

        const parts = response.candidates[0].content.parts;
        let base64Audio = '';
        for (const part of parts) {
            if (part.inlineData?.data) {
                base64Audio = part.inlineData.data;
                break;
            }
        }

        if (!base64Audio) throw new Error("No audio data returned from the Oracle.");
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decodedBytes = decodeBase64(base64Audio);
        return await decodeAudioData(decodedBytes, audioCtx, 24000, 1);
    } catch (e: any) {
        console.error("TTS Generation Failed:", e);
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
    } catch (e: any) {
        console.error("Chat Session Creation Error:", e);
        throw new Error("Sage Vashishtha is currently in deep meditation. Try later.");
    }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Translate the following report into ${targetLanguage}. Maintain all Markdown formatting strictly. Text: ${text}`
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        return response.text || text;
    } catch (error: any) {
        console.error("Translation failed:", error);
        return text;
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
            contents: `User: ${name}, DOB: ${dob}, Intent: ${intent}. Recommend Gemstone & Mantra in ${language}.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.error("Gemstone Service Error:", error);
        throw new Error("The gemstone revelation was clouded.");
    }
};

export const getAyurvedicAnalysis = async (answers: string, language: string = 'English'): Promise<any> => {
    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                dosha: { type: Type.STRING },
                breakdown: { type: Type.OBJECT, properties: { vata: { type: Type.NUMBER }, pitta: { type: Type.NUMBER }, kapha: { type: Type.NUMBER } } },
                diet: { type: Type.ARRAY, items: { type: Type.STRING } },
                lifestyle: { type: Type.ARRAY, items: { type: Type.STRING } },
                fullReading: { type: Type.STRING }
            },
            required: ["dosha", "breakdown", "diet", "lifestyle", "fullReading"]
        };
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze Dosha: ${answers}. Provide result in ${language}.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.error("Ayurveda Service Error:", error);
        throw new Error("Dhanvantari is silent.");
    }
};

export const getMuhurat = async (activity: string, date: string, language: string = 'English'): Promise<any> => {
    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                bestTime: { type: Type.STRING },
                rating: { type: Type.STRING },
                reason: { type: Type.STRING },
                fullReading: { type: Type.STRING }
            },
            required: ["bestTime", "rating", "reason", "fullReading"]
        };
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Calculate Muhurat for: "${activity}" on ${date}. Output in ${language}.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.error("Muhurat Service Error:", error);
        throw new Error("Time is elusive.");
    }
};

export const getCosmicSync = async (p1: any, p2: any, language: string = 'English'): Promise<any> => {
    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: {
                compatibilityScore: { type: Type.NUMBER },
                relationshipType: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
                fullReading: { type: Type.STRING }
            },
            required: ["compatibilityScore", "relationshipType", "strengths", "challenges", "fullReading"]
        };
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze Compatibility: Person A ${JSON.stringify(p1)}, Person B ${JSON.stringify(p2)}. Language: ${language}.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.error("CosmicSync Error:", error);
        throw new Error("Connection cloudy.");
    }
};

export const getPalmReading = async (imageFile: File, language: string = 'English'): Promise<PalmMetricResponse> => {
  try {
    const ai = getAi();
    const base64Data = await fileToBase64(imageFile);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { mimeType: imageFile.type, data: base64Data } }, { text: `Vedic Palmistry analysis in ${language}.` }] },
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { textReading: { type: Type.STRING } } } }
    });
    // Fix: Use response.text property directly as per guidelines for extracted string output
    const json = JSON.parse(response.text || "{}");
    return { rawMetrics: json, textReading: json.textReading || "Analysis complete." };
  } catch (error: any) {
    console.error("Palm Reading Error:", error);
    throw new Error("Line analysis failed.");
  }
};

export const getFaceReading = async (imageFile: File, language: string = 'English'): Promise<FaceMetricResponse> => {
    try {
        const ai = getAi();
        const base64Data = await fileToBase64(imageFile);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType: imageFile.type, data: base64Data } }, { text: `Vedic Face analysis in ${language}.` }] },
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { textReading: { type: Type.STRING } } } }
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        const json = JSON.parse(response.text || "{}");
        return { rawMetrics: json, textReading: json.textReading || "Analysis complete." };
    } catch (error: any) {
        console.error("Face Reading Error:", error);
        throw new Error("Facial mapping failed.");
    }
};

export const getAstroNumeroReading = async (details: any): Promise<{ reading: string }> => {
    try {
        const ai = getAi();
        let prompt = `Expert ${details.mode} reading for: Name: ${details.name}, DOB: ${details.dob}, Language: ${details.language}.`;
        if (details.mode === 'astrology') {
            prompt += ` TOB: ${details.tob}, POB: ${details.pob}. Comprehensive Kundli prediction.`;
        } else {
            prompt += ` Life Path, Expression, Soul Urge analysis.`;
        }
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        return { reading: response.text || "The Oracle did not provide a text reading." };
    } catch (error: any) {
        console.error("AI Calculation Error:", error);
        throw new Error(`AI calculation failed: ${error.message || 'Unknown error'}`);
    }
};

export const getTarotReading = async (cardName: string, language: string = 'English'): Promise<string> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Tarot reading for "${cardName}" in ${language}.`,
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        return response.text || "No response.";
    } catch (error: any) {
        console.error("Tarot Service Error:", error);
        throw new Error("Spirits of the deck are restless.");
    }
};

export const getRemedy = async (concern: string, language: string = 'English'): Promise<string> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Remedies for: "${concern}" in ${language}.`,
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        return response.text || "No response.";
    } catch (error: any) {
        console.error("Remedy Service Error:", error);
        throw new Error("Cosmic winds blocked guidance.");
    }
};

export const analyzeDream = async (dreamText: string, language: string = 'English'): Promise<DreamAnalysisResponse> => {
    try {
        const ai = getAi();
        const schema = {
            type: Type.OBJECT,
            properties: { meaning: { type: Type.STRING }, luckyNumbers: { type: Type.ARRAY, items: { type: Type.INTEGER } }, symbols: { type: Type.ARRAY, items: { type: Type.STRING } } },
            required: ["meaning", "luckyNumbers", "symbols"]
        };
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Interpret dream in ${language}: "${dreamText}"`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        // Fix: Use response.text property directly as per guidelines for extracted string output
        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.error("Dream Service Error:", error);
        throw new Error("Subconscious mists too thick.");
    }
};
