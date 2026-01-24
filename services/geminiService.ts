import { GoogleGenAI, Type, Modality } from "@google/genai";

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

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Recite this with deep, mystical resonance: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned.");
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  return await decodeAudioData(decodeBase64(base64Audio), audioCtx, 24000, 1);
};

export const createSageSession = (contextReading: string, topic: string) => {
  const ai = getAi();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Sage Vashishtha, an ancient Vedic Rishi. Context: ${contextReading.substring(0, 5000)}`
    }
  });
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following report into ${targetLanguage}. Maintain all formatting: ${text}`
  });
  return response.text || text;
};

export const getGemstoneGuidance = async (name: string, dob: string, intent: string, language: string = 'English'): Promise<any> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Recommend gemstone for ${name}, DOB ${dob}, seeking ${intent} in ${language}.`,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primaryGem: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, sanskritName: { type: Type.STRING }, reason: { type: Type.STRING }, wearingMethod: { type: Type.STRING } } },
          mantra: { type: Type.OBJECT, properties: { sanskrit: { type: Type.STRING }, pronunciation: { type: Type.STRING }, meaning: { type: Type.STRING } } },
          fullReading: { type: Type.STRING }
        },
        required: ["primaryGem", "mantra", "fullReading"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getAyurvedicAnalysis = async (answers: string, language: string = 'English'): Promise<any> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Ayurveda analysis for: ${answers} in ${language}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dosha: { type: Type.STRING },
          breakdown: { type: Type.OBJECT, properties: { vata: { type: Type.NUMBER }, pitta: { type: Type.NUMBER }, kapha: { type: Type.NUMBER } } },
          diet: { type: Type.ARRAY, items: { type: Type.STRING } },
          lifestyle: { type: Type.ARRAY, items: { type: Type.STRING } },
          fullReading: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getMuhurat = async (activity: string, date: string, language: string = 'English'): Promise<any> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Best time for ${activity} on ${date} in ${language}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { bestTime: { type: Type.STRING }, rating: { type: Type.STRING }, reason: { type: Type.STRING }, fullReading: { type: Type.STRING } }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getCosmicSync = async (p1: any, p2: any, language: string = 'English'): Promise<any> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Compatibility: P1 ${JSON.stringify(p1)}, P2 ${JSON.stringify(p2)} in ${language}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { compatibilityScore: { type: Type.NUMBER }, relationshipType: { type: Type.STRING }, strengths: { type: Type.ARRAY, items: { type: Type.STRING } }, challenges: { type: Type.ARRAY, items: { type: Type.STRING } }, fullReading: { type: Type.STRING } }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getPalmReading = async (imageFile: File, language: string = 'English'): Promise<PalmMetricResponse> => {
  const ai = getAi();
  const base64Data = await fileToBase64(imageFile);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType: imageFile.type, data: base64Data } }, { text: `Vedic Palmistry analysis in ${language}.` }] },
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { textReading: { type: Type.STRING } } } }
  });
  const text = response.text;
  if (!text) throw new Error("Empty response from Oracle.");
  const json = JSON.parse(text);
  return { rawMetrics: json, textReading: json.textReading || "Analysis complete." };
};

export const getFaceReading = async (imageFile: File, language: string = 'English'): Promise<FaceMetricResponse> => {
  const ai = getAi();
  const base64Data = await fileToBase64(imageFile);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType: imageFile.type, data: base64Data } }, { text: `Vedic Face reading in ${language}.` }] },
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { textReading: { type: Type.STRING } } } }
  });
  const text = response.text;
  if (!text) throw new Error("Empty response from Oracle.");
  const json = JSON.parse(text);
  return { rawMetrics: json, textReading: json.textReading || "Analysis complete." };
};

export const getAstroNumeroReading = async (details: any): Promise<{ reading: string }> => {
  const ai = getAi();
  let prompt = `Provide a detailed ${details.mode} reading for: Name: ${details.name}, DOB: ${details.dob}, Language: ${details.language}.`;
  if (details.mode === 'astrology') prompt += ` TOB: ${details.tob}, POB: ${details.pob}. Comprehensive Prediction.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
  const text = response.text;
  if (!text || text.trim().length < 50) throw new Error("The Oracle's message was too faint. Please retry.");
  return { reading: text };
};

export const getTarotReading = async (cardName: string, language: string = 'English'): Promise<string> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Detailed Tarot reading for "${cardName}" in ${language}.`,
  });
  const text = response.text;
  if (!text || text.trim().length < 20) throw new Error("Tarot interpretation failed.");
  return text;
};

export const getRemedy = async (concern: string, language: string = 'English'): Promise<string> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Vedic remedies and guidance for: "${concern}" in ${language}.`,
  });
  const text = response.text;
  if (!text || text.trim().length < 20) throw new Error("Guidance failed.");
  return text;
};

export const analyzeDream = async (dreamText: string, language: string = 'English'): Promise<DreamAnalysisResponse> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Interpret dream in ${language}: "${dreamText}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { meaning: { type: Type.STRING }, luckyNumbers: { type: Type.ARRAY, items: { type: Type.INTEGER } }, symbols: { type: Type.ARRAY, items: { type: Type.STRING } } },
        required: ["meaning", "luckyNumbers", "symbols"]
      }
    }
  });
  const text = response.text;
  if (!text) throw new Error("Dream interpretation failed.");
  return JSON.parse(text);
};
