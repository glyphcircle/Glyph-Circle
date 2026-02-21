// Tarot.tsx - COMPLETE & FIXED
// ✅ Fix 1: selectedCardRef tracks card immediately (no animation delay)
// ✅ Fix 2: onReportGenerated forces selectedCard from ref before isPaid flips
// ✅ Fix 3: Render guard includes isPaid so FullReport always shows
// ✅ Fix 4: All card references use (selectedCard || selectedCardRef.current)
// ✅ Fix 5: startNewReading clears ref too
// ✅ Fix 6: Mobile optimized scroll behavior

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServicePayment } from '../hooks/useServicePayment';
import { getTarotReading, translateText } from '../services/aiService';
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
import { SkeletonReport } from './shared/SkeletonLoader';
import ErrorBoundary from './shared/ErrorBoundary';
import SmartBackButton from './shared/SmartBackButton';
import { dbService } from '../services/db';
import ServiceResult from './ServiceResult';
import { useTheme } from '../context/ThemeContext';

// ─── Deck Generation ──────────────────────────────────────────────────────────

const SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'] as const;
const RANKS = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'
];
const MAJOR_NAMES = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress',
  'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot',
  'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice',
  'The Hanged Man', 'Death', 'Temperance', 'The Devil',
  'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
];

const GENERATE_DECK = (): TarotCardData[] => {
  const deck: TarotCardData[] = [];
  MAJOR_NAMES.forEach((name, i) => {
    deck.push({ id: `major-${i}`, number: i, name, type: 'Major' });
  });
  SUITS.forEach(suit => {
    RANKS.forEach((rank, i) => {
      deck.push({
        id: `minor-${suit}-${i}`,
        number: i + 1,
        name: `${rank} of ${suit}`,
        type: 'Minor',
        suit,
        rank
      });
    });
  });
  return deck;
};

const FULL_DECK = GENERATE_DECK();

// ─── Component ────────────────────────────────────────────────────────────────

const Tarot: React.FC = () => {

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedCard, setSelectedCard] = useState<TarotCardData | null>(null);
  const [reading, setReading] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [animatingCard, setAnimatingCard] = useState<{ card: TarotCardData; startRect: DOMRect } | null>(null);
  const [retrievedTx, setRetrievedTx] = useState<any>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const resultsRef = useRef<HTMLDivElement>(null);
  const fullReportRef = useRef<HTMLDivElement>(null);
  const prevLangRef = useRef('');

  // ✅ FIX 1: Tracks the card immediately — not gated by animation or state timing
  const selectedCardRef = useRef<TarotCardData | null>(null);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { openPayment } = usePayment();
  const { user, awardKarma } = useAuth();
  const { db } = useDb();
  const { theme } = useTheme();
  const isLight = theme.mode === 'light';

  // ✅ FIX 2: Keep ref in sync whenever selectedCard state updates
  useEffect(() => {
    if (selectedCard) selectedCardRef.current = selectedCard;
  }, [selectedCard]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getLanguageName = (code: string) => {
    const map: Record<string, string> = {
      en: 'English', hi: 'Hindi', fr: 'French', es: 'Spanish'
    };
    return map[code] || 'English';
  };

  // Resolves current card from state OR ref — whichever is available
  const currentCard = selectedCard ?? selectedCardRef.current;

  const isAdmin = user && [
    'master@glyphcircle.com',
    'admin@glyphcircle.com'
  ].includes(user.email);

  // ── Scroll helper — works on all devices ──────────────────────────────────
  const scrollToReport = useCallback(() => {
    // Try ref scroll first, fall back to window scroll
    setTimeout(() => {
      if (fullReportRef.current) {
        fullReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 150);
  }, []);

  // ── useServicePayment ──────────────────────────────────────────────────────
  const { initiateFlow, isCheckingCache } = useServicePayment({
    serviceType: 'tarot',

    onReportGenerated: (data) => {
      console.log('✅ [Tarot] Report display triggered');

      // ✅ FIX 3: If selectedCard state hasn't settled yet (free service fires
      // onReportGenerated synchronously before animation completes),
      // force it from the ref we set immediately on card click.
      if (!selectedCard && selectedCardRef.current) {
        setSelectedCard(selectedCardRef.current);
      }

      setIsPaid(true);
      scrollToReport();
    },

    onCacheRestored: (readingData, transaction) => {
      console.log('✅ [Tarot] Cache restored:', readingData);
      setRetrievedTx(transaction);
      setReading(readingData.content);
      const card = readingData.meta_data?.card || { name: readingData.title };
      setSelectedCard(card);
      selectedCardRef.current = card; // ✅ sync ref too
      setIsPaid(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // ── Session restore (viewReport) ───────────────────────────────────────────
  useEffect(() => {
    const savedReport = sessionStorage.getItem('viewReport');
    if (savedReport) {
      try {
        const { reading: savedReading, timestamp } = JSON.parse(savedReport);
        if (Date.now() - timestamp < 300000 && savedReading.type === 'tarot') {
          const card = savedReading.meta_data?.card || { name: savedReading.title };
          setReading(savedReading.content);
          setSelectedCard(card);
          selectedCardRef.current = card;
          setIsPaid(true);
          sessionStorage.removeItem('viewReport');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch {
        sessionStorage.removeItem('viewReport');
      }
    }
  }, []);

  // ── Auto PDF download ──────────────────────────────────────────────────────
  useEffect(() => {
    const flag = sessionStorage.getItem('autoDownloadPDF');
    if (flag && isPaid && reading) {
      sessionStorage.removeItem('autoDownloadPDF');
      setTimeout(() => {
        const btn = document.querySelector('[data-report-download="true"]') as HTMLButtonElement | null;
        btn?.click();
      }, 1500);
    }
  }, [isPaid, reading]);

  // ── Language change re-translation ────────────────────────────────────────
  useEffect(() => {
    if (reading && !isLoading && prevLangRef.current && prevLangRef.current !== language) {
      const handleLangShift = async () => {
        setIsLoading(true);
        try {
          const translated = await translateText(reading, getLanguageName(language));
          setReading(translated);
        } catch (e) {
          console.error('Translation error', e);
        } finally {
          setIsLoading(false);
        }
      };
      handleLangShift();
    }
    prevLangRef.current = language;
  }, [language]);

  // ── Scroll to full report when isPaid flips ────────────────────────────────
  useEffect(() => {
    if (isPaid && reading) {
      scrollToReport();
    }
  }, [isPaid, reading]);

  // ── Shuffled deck (memoized) ───────────────────────────────────────────────
  const shuffledDeck = useMemo(() => {
    const deck = [...FULL_DECK];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }, []);

  // ── AI Reading ─────────────────────────────────────────────────────────────
  const generateReading = useCallback(async (card: TarotCardData) => {
    setIsLoading(true);
    setProgress(0);
    setReading('');
    setError('');
    setIsPaid(false);

    const timer = setInterval(() => {
      setProgress(prev => (prev >= 90 ? prev : prev + 15));
    }, 300);

    try {
      const result = await getTarotReading(card.name, getLanguageName(language));
      clearInterval(timer);
      setProgress(100);
      setReading(result);
      awardKarma(ACTION_POINTS.READING_COMPLETE);
    } catch (err: any) {
      clearInterval(timer);
      setError(err.message || 'The cosmic connection was interrupted.');
    } finally {
      setIsLoading(false);
    }
  }, [language, awardKarma]);

  // ── Card Select ────────────────────────────────────────────────────────────
  const handleCardSelect = useCallback((
    card: TarotCardData,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (isPaid || animatingCard || selectedCard) return;

    // ✅ FIX 4: Set ref immediately — don't wait for 1100ms animation to complete.
    // This ensures onReportGenerated always has a card to work with.
    selectedCardRef.current = card;

    const rect = e.currentTarget.getBoundingClientRect();
    setAnimatingCard({ card, startRect: rect });
    generateReading(card);
  }, [isPaid, animatingCard, selectedCard, generateReading]);

  // ── Animation complete → commit selectedCard state ─────────────────────────
  useEffect(() => {
    if (animatingCard) {
      const landingTimer = setTimeout(() => {
        setSelectedCard(animatingCard.card);
        setAnimatingCard(null);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }, 1100);
      return () => clearTimeout(landingTimer);
    }
  }, [animatingCard]);

  // ── "Read More" / payment gate ─────────────────────────────────────────────
  const handleReadMore = async () => {
    if (!reading || !currentCard) return;

    await initiateFlow(
      {
        name: user?.user_metadata?.full_name || user?.email,
        card_name: currentCard.name,
        card_type: currentCard.type
      },
      async () => ({
        reading: reading,
        content: reading,
        meta_data: { card: currentCard }
      })
    );
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const startNewReading = () => {
    setSelectedCard(null);
    selectedCardRef.current = null; // ✅ FIX 5: clear ref
    setReading('');
    setError('');
    setIsPaid(false);
    setRetrievedTx(null);
    setAnimatingCard(null);
    setProgress(0);
    sessionStorage.removeItem('viewReport');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Service config ─────────────────────────────────────────────────────────
  const tarotService = db.services?.find((s: any) => s.id === 'tarot');
  const servicePrice = tarotService?.price || 49;
  const serviceImageData = tarotService?.image;

  const fallbackImage = db.image_assets?.find(
    (a: any) => a.id === 'report_bg_tarot'
  )?.path || 'https://images.unsplash.com/photo-1505537528343-4dc9b89823f6?q=80&w=800';

  const reportImage = serviceImageData
    ? (typeof serviceImageData === 'string'
      ? serviceImageData
      : cloudManager.resolveImage(serviceImageData))
    : fallbackImage;

  const siteLogo = useMemo(() => {
    const logoAsset = db.image_assets?.find((a: any) => a.id === 'site_logo');
    if (logoAsset?.path) {
      return typeof logoAsset.path === 'string'
        ? logoAsset.path
        : cloudManager.resolveImage(logoAsset.path);
    }
    return '/logo.png';
  }, [db.image_assets]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-12 items-center">
      <div className="w-full max-w-7xl mx-auto px-4 relative min-h-screen pb-12">

        <SmartBackButton label={t('backToHome')} className="relative z-10 mb-4" />

        {/* New Card Draw button */}
        {(currentCard || isPaid || retrievedTx) && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={startNewReading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 min-h-[44px]"
              style={{ touchAction: 'manipulation' }}
            >
              <span>✨</span>
              <span>New Card Draw</span>
            </button>
          </div>
        )}

        {/* Previously purchased banner */}
        {retrievedTx && !isPaid && (
          <div className={`
            rounded-2xl p-6 mb-8 shadow-xl border-2 animate-fade-in-up
            ${isLight
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
              : 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/40'
            }
          `}>
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div>
                <h3 className={`font-cinzel font-black text-xl uppercase ${isLight ? 'text-emerald-800' : 'text-green-400'}`}>
                  Already Purchased This Year!
                </h3>
                <p className={`text-sm italic ${isLight ? 'text-emerald-700' : 'text-green-300/70'}`}>
                  Sacred card draw retrieved from history.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsPaid(true);
                    scrollToReport();
                  }}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest min-h-[44px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  📄 View Full
                </button>
                <button
                  onClick={startNewReading}
                  className="bg-purple-600 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest min-h-[44px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  ✨ New
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero header — shown when no card selected */}
        {!currentCard && !isPaid && (
          <div className="relative z-10 mb-8 text-center animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 mb-4 font-cinzel drop-shadow-lg">
              {t('tarotReading')}
            </h2>
            <p className="text-amber-100/80 font-lora italic text-lg max-w-2xl mx-auto">
              The deck contains 78 mysteries. Let your intuition guide your hand.
            </p>
          </div>
        )}

        {/* Card deck grid */}
        {!currentCard && !animatingCard && (
          <div className="relative z-10 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4 justify-items-center pb-20 animate-fade-in-up">
            {shuffledDeck.map((card) => (
              <TarotCard
                key={card.id}
                card={card}
                isSelected={false}
                onClick={(e) => handleCardSelect(card, e)}
              />
            ))}
          </div>
        )}

        {/* ✅ FIX 6: Guard includes `isPaid` so FullReport renders even when
            selectedCard state hasn't caught up yet (free service race condition) */}
        {(isLoading || currentCard || isPaid) && !animatingCard && (
          <div ref={resultsRef} className="w-full max-w-5xl mx-auto animate-fade-in-up">
            <div className="flex flex-col items-center gap-8">

              {/* Selected card display */}
              {currentCard && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-amber-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse-glow"></div>
                  <div className="relative w-64 aspect-[2/3] transform transition-transform duration-500 hover:scale-105">
                    <TarotCard
                      card={currentCard}
                      isSelected={true}
                      onClick={() => { }}
                    />
                  </div>
                </div>
              )}

              <div className="w-full">

                {/* Loading state */}
                {isLoading && (
                  <div className="max-w-md mx-auto">
                    <ProgressBar progress={progress} message="Interpreting the Arcana..." />
                    <SkeletonReport />
                  </div>
                )}

                {/* Error state */}
                {error && !isLoading && (
                  <div className="text-center py-8">
                    <p className="text-red-400 font-lora italic mb-4">{error}</p>
                    <button
                      onClick={startNewReading}
                      className="bg-purple-600 text-white px-6 py-3 rounded-full text-sm font-bold"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Reading available */}
                {reading && !isLoading && (
                  <div className="space-y-8">

                    {/* Card title */}
                    {currentCard && (
                      <div className="text-center">
                        <h3 className="text-3xl md:text-4xl font-bold text-amber-300 mb-2 font-cinzel">
                          {currentCard.name}
                        </h3>
                        <div className="text-amber-500 text-sm font-bold tracking-[0.3em] uppercase">
                          {currentCard.type} Arcana
                        </div>
                      </div>
                    )}

                    {/* Preview / paygate */}
                    {!isPaid && !retrievedTx ? (
                      <ServiceResult
                        serviceName="TAROT"
                        serviceIcon="🃏"
                        previewText={reading}
                        onRevealReport={handleReadMore}
                        isAdmin={isAdmin}
                        onAdminBypass={() => setIsPaid(true)}
                      />
                    ) : isPaid ? (
                      /* ✅ Full report — always renders when isPaid=true */
                      <div ref={fullReportRef} className="w-full">
                        <ErrorBoundary>
                          <FullReport
                            reading={reading}
                            category="tarot"
                            title={currentCard?.name || 'Tarot Reading'}
                            subtitle={`${currentCard?.type || 'Major'} Arcana • Vedic Insight`}
                            imageUrl={reportImage}
                            logo={siteLogo}
                          />
                        </ErrorBoundary>
                      </div>
                    ) : null}

                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Cache checking overlay */}
      {isCheckingCache && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250]">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-10 rounded-3xl shadow-2xl border border-amber-500/30 max-w-md w-full mx-4 text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto relative">
                <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-3 border-4 border-amber-500/10 rounded-full"></div>
                <div
                  className="absolute inset-3 border-4 border-b-amber-400 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin"
                  style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                ></div>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-3 tracking-wide">Checking Registry</h3>
            <p className="text-gray-300 mb-2 text-lg">Verifying your purchase history</p>
            <p className="text-gray-500 text-sm mb-6">Scanning the celestial archives...</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default Tarot;
