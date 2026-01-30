import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { getTarotReading } from '../services/geminiService';
import Card from './shared/Card';
import ProgressBar from './shared/ProgressBar';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import { usePayment } from '../context/PaymentContext';
import TarotCard, { TarotCardData } from './TarotCard';
import FullReport from './FullReport';
import { useAuth } from '../context/AuthContext';
import { ACTION_POINTS } from '../services/gamificationConfig';
import { useDb } from '../hooks/useDb';
import { cloudManager } from '../services/cloudManager';
import InlineError from './shared/InlineError';
import { SkeletonReport } from './shared/SkeletonLoader';
import ErrorBoundary from './shared/ErrorBoundary';

const SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'] as const;
const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const MAJOR_NAMES = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor', 
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit', 
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance', 
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
];

const GENERATE_DECK = (): TarotCardData[] => {
    const deck: TarotCardData[] = [];
    MAJOR_NAMES.forEach((name, i) => deck.push({ id: `major-${i}`, number: i, name, type: 'Major' }));
    SUITS.forEach(suit => RANKS.forEach((rank, i) => deck.push({ id: `minor-${suit}-${i}`, number: i + 1, name: `${rank} of ${suit}`, type: 'Minor', suit, rank })));
    return deck;
};

const FULL_DECK = GENERATE_DECK();

const calculateTarotVedicData = (card: TarotCardData) => {
    let vedicMetrics = [{ label: 'Karma', value: 70 }, { label: 'Wisdom', value: 80 }, { label: 'Power', value: 65 }];
    if (card.type === 'Major') vedicMetrics = [{ label: 'Karma', value: 95 }, { label: 'Wisdom', value: 90 }, { label: 'Power', value: 85 }];
    return { vedicMetrics };
};

const Tarot: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<TarotCardData | null>(null);
  const [reading, setReading] = useState<string>('');
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { t, language } = useTranslation();
  const { openPayment } = usePayment();
  const { user, awardKarma, saveReading } = useAuth();
  const { db } = useDb();

  const isAdmin = user?.role === 'admin';
  const shuffledDeck = useMemo(() => {
      const deck = [...FULL_DECK];
      for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck.slice(0, 48); // Performance: show a subset of visual deck
  }, []);

  const generateReading = useCallback(async (card: TarotCardData) => {
    setIsLoading(true); setProgress(0); setReading(''); setChartData(null); setError(''); setIsPaid(false);
    const timer = setInterval(() => setProgress(prev => (prev >= 90 ? prev : prev + 15)), 300);
    try {
      setChartData(calculateTarotVedicData(card));
      const result = await getTarotReading(card.name, language === 'hi' ? 'Hindi' : 'English');
      clearInterval(timer); setProgress(100);
      setReading(result);
      awardKarma(ACTION_POINTS.READING_COMPLETE);
      saveReading({ type: 'tarot', title: card.name, content: result, image_url: "https://images.unsplash.com/photo-1505537528343-4dc9b89823f6?q=80&w=800" });
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err: any) { clearInterval(timer); setError(`${err.message || 'The cosmic connection was interrupted.'}`); } finally { setIsLoading(false); }
  }, [language, awardKarma, saveReading]);

  const handleCardSelect = (card: TarotCardData) => { if (!isLoading && !selectedCard) { setSelectedCard(card); generateReading(card); } };
  const tarotService = db.services?.find((s: any) => s.id === 'tarot');
  const servicePrice = tarotService?.price || 49;
  const resetReading = () => { setSelectedCard(null); setReading(''); setError(''); setIsPaid(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="relative min-h-screen bg-[#0F0F23] pt-12 pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
            <div className="absolute top-10 left-10 w-32 h-32 border-t-4 border-l-4 border-amber-500 rounded-tl-3xl shadow-[0_0_20px_rgba(245,158,11,0.3)]"></div>
            <div className="absolute top-10 right-10 w-32 h-32 border-t-4 border-r-4 border-amber-500 rounded-tr-3xl"></div>
            <div className="absolute bottom-10 left-10 w-32 h-32 border-b-4 border-l-4 border-amber-500 rounded-bl-3xl"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 border-b-4 border-r-4 border-amber-500 rounded-br-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
            <Link to="/home" className="inline-flex items-center text-amber-200/60 hover:text-amber-400 transition-all mb-8 group">
                <span className="text-2xl mr-3 group-hover:-translate-x-2 transition-transform">←</span>
                <span className="font-cinzel font-black uppercase tracking-widest text-xs">Exit Sanctuary</span>
            </Link>

            {!selectedCard && (
                <div className="text-center mb-16 animate-fade-in-up">
                    <div className="relative w-48 h-48 mx-auto mb-10 flex items-center justify-center">
                        <div className="absolute inset-[-40px] bg-[radial-gradient(circle,rgba(139,92,246,0.2)_0%,transparent_70%)] animate-pulse rounded-full blur-2xl"></div>
                        <div className="w-32 h-32 bg-black rounded-full border-4 border-amber-500 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)]">
                            <span className="text-6xl">🔮</span>
                        </div>
                    </div>
                    <h2 className="text-5xl md:text-6xl font-cinzel font-black text-white uppercase tracking-widest mb-4">AI <span className="gold-gradient-text">Tarot Reading</span></h2>
                    <p className="text-amber-100/60 font-lora italic text-lg max-w-2xl mx-auto">Select a card from the deck of mysteries. Let your intuition guide your path.</p>
                </div>
            )}

            {!selectedCard && (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4 pb-20 animate-fade-in-up">
                    {shuffledDeck.map((card) => (
                        <TarotCard key={card.id} card={card} isSelected={false} onClick={() => handleCardSelect(card)} />
                    ))}
                </div>
            )}

            {(isLoading || selectedCard) && (
                <div ref={resultsRef} className="w-full max-w-5xl mx-auto animate-fade-in-up">
                    <div className="flex flex-col items-center gap-12">
                        <div className="relative group w-64 aspect-[2/3] transform transition-all duration-700 hover:scale-105">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-amber-600 rounded-xl blur opacity-75 animate-pulse-glow"></div>
                            <TarotCard card={selectedCard!} isSelected={true} onClick={() => {}} />
                        </div>

                        <div className="w-full">
                            {isLoading && <div className="max-w-md mx-auto"><ProgressBar progress={progress} message="Shuffling the Akasha..." /><SkeletonReport /></div>}
                            {error && <InlineError message={error} onRetry={() => generateReading(selectedCard!)} />}
                            {reading && !isLoading && (
                                <div className="space-y-10">
                                    <div className="text-center"><h3 className="text-4xl font-cinzel font-black text-amber-300 mb-2">{selectedCard!.name}</h3><div className="text-amber-500 text-sm font-bold tracking-[0.4em] uppercase">{selectedCard!.type} ARCANA</div></div>
                                    {!isPaid ? (
                                        <Card className="p-10 border-2 border-amber-500/20 bg-gray-900/80 shadow-2xl relative overflow-hidden">
                                            <div className="italic font-lora text-amber-100/90 text-2xl leading-relaxed mb-12 line-clamp-4">"{reading}"</div>
                                            <div className="flex flex-col items-center gap-6">
                                                <Button onClick={() => openPayment(() => setIsPaid(true), 'Imperial Tarot Report', servicePrice)} className="px-12 py-5 bg-[#2d0a18] hover:bg-[#4a0404] text-white rounded-full font-cinzel font-black uppercase tracking-[0.2em] shadow-2xl transition-all">Reveal Full Interpretation</Button>
                                                <button onClick={resetReading} className="text-xs text-gray-500 hover:text-white uppercase tracking-widest underline">Draw Another Card</button>
                                                {isAdmin && <button onClick={() => setIsPaid(true)} className="text-[9px] text-amber-900/40 uppercase">Master Access</button>}
                                            </div>
                                        </Card>
                                    ) : (
                                        <div className="w-full">
                                            <FullReport reading={reading} title={selectedCard!.name} subtitle={`${selectedCard!.type} Arcana`} imageUrl="https://images.unsplash.com/photo-1505537528343-4dc9b89823f6?q=80&w=800" chartData={chartData} />
                                            <div className="text-center mt-12"><button onClick={resetReading} className="px-12 py-4 bg-black border border-amber-500/30 text-amber-200 font-cinzel font-bold uppercase tracking-widest rounded-full hover:bg-gray-900 transition-all">Draw New Fate</button></div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Tarot;