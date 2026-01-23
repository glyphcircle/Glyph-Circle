
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import VoiceInput from './VoiceInput';
import { createSageSession } from '../services/geminiService';
import { useTranslation } from '../hooks/useTranslation';

const VoiceOracle: React.FC = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<{sender: string, text: string}[]>([]);
  const [session, setSession] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
      try {
          const s = createSageSession("You are the Voice Oracle. Speak concisely and mystically.", "Voice");
          setSession(s);
      } catch (e) {
          console.error(e);
      }
  }, []);

  const speak = (text: string) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.8;
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
  };

  const handleInput = async (text: string) => {
      setHistory(prev => [...prev, { sender: 'user', text }]);
      if (session) {
          const res = await session.sendMessage({ message: text });
          const reply = res.text || "I hear you.";
          setHistory(prev => [...prev, { sender: 'oracle', text: reply }]);
          speak(reply);
      }
  };

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col items-center">
        <Link to="/home" className="mb-8 text-amber-200">&larr; Silence</Link>
        
        <div className="w-full max-w-md relative">
            <div className={`w-48 h-48 mx-auto rounded-full bg-gradient-to-b from-purple-900 to-black border-4 border-amber-500/50 shadow-[0_0_50px_rgba(139,92,246,0.5)] flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'scale-110 shadow-[0_0_80px_rgba(139,92,246,0.8)]' : ''}`}>
                <span className="text-6xl filter drop-shadow-lg">🧙‍♂️</span>
            </div>
            
            <div className="mt-12 h-64 overflow-y-auto custom-scrollbar bg-black/40 rounded-xl p-4 border border-white/10 space-y-4">
                {history.map((msg, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-gray-800 ml-auto max-w-[80%]' : 'bg-purple-900/50 mr-auto max-w-[80%] text-amber-100'}`}>
                        {msg.text}
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-center">
                <VoiceInput onResult={handleInput} className="scale-150" />
            </div>
            <p className="text-center text-gray-500 text-xs mt-4">Tap microphone to speak to the Oracle</p>
        </div>
    </div>
  );
};

export default VoiceOracle;
