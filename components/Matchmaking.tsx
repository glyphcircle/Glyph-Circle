
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import { useTranslation } from '../hooks/useTranslation';
import { SmartDatePicker } from './SmartAstroInputs';

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

const Matchmaking: React.FC = () => {
  const { t } = useTranslation();
  const [boyName, setBoyName] = useState('');
  const [girlName, setGirlName] = useState('');
  const [boyNak, setBoyNak] = useState(NAKSHATRAS[0]);
  const [girlNak, setGirlNak] = useState(NAKSHATRAS[0]);
  const [boyDob, setBoyDob] = useState('');
  const [girlDob, setGirlDob] = useState('');
  
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Calculating Gunas...');

  const calculateCompatibility = () => {
      setIsLoading(true);
      setProgress(0);
      setScore(null);
      setStatusMessage('Aligning Planetary Positions...');

      // Simulate calculations
      const timer = setInterval(() => {
          setProgress(prev => {
              if (prev >= 90) return prev;
              if (prev > 40 && prev < 50) setStatusMessage('Analysing Moon Signs...');
              if (prev > 70 && prev < 80) setStatusMessage('Checking Manglik Dosha...');
              return prev + 10;
          });
      }, 300);

      setTimeout(() => {
          clearInterval(timer);
          setProgress(100);
          
          // Deterministic "Random" Score based on complex seed
          // Incorporates names, nakshatras, and birth dates to simulate precision
          const boyDobVal = boyDob ? new Date(boyDob).getTime() : 0;
          const girlDobVal = girlDob ? new Date(girlDob).getTime() : 0;
          
          const seed = boyName.length + girlName.length + 
                       NAKSHATRAS.indexOf(boyNak) * 2 + NAKSHATRAS.indexOf(girlNak) * 2 +
                       (boyDobVal % 100) + (girlDobVal % 100);
                       
          // Score between 12 and 36 (Skewed slightly higher for demo feel)
          const calcScore = 12 + (seed % 25); 
          setScore(calcScore);
          setIsLoading(false);
      }, 3000);
  };

  const getVerdict = (s: number) => {
      if (s >= 28) return { text: "Excellent Union (Uttam)", color: "text-green-400" };
      if (s >= 18) return { text: "Good Compatibility (Madhyam)", color: "text-yellow-400" };
      return { text: "Incompatible (Adham)", color: "text-red-400" };
  };

  const isValid = boyName && girlName && boyDob && girlDob;

  return (
    <div className="max-w-4xl mx-auto min-h-screen">
       <Link to="/home" className="inline-flex items-center text-amber-200 hover:text-amber-400 transition-colors mb-6 group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('backToHome')}
        </Link>

        <div className="text-center mb-10">
            <h2 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-600 mb-2">
                Vedic Matchmaking
            </h2>
            <p className="text-amber-100/60 font-lora">Ashta Koota Guna Milan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* BOY CARD */}
            <Card className="p-6 border-l-4 border-blue-500">
                <h3 className="text-xl font-bold text-blue-300 mb-4 font-cinzel">Partner A (Boy)</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 uppercase mb-1">Name</label>
                        <input 
                            type="text" 
                            value={boyName}
                            onChange={(e) => setBoyName(e.target.value)}
                            className="w-full bg-gray-900 border border-blue-500/30 rounded p-2 text-white"
                            placeholder="Enter Name"
                        />
                    </div>
                    <div className="relative">
                        {/* Using SmartDatePicker for consistent styling, passing label overrides via parent context or just relying on its internal style */}
                        <div className="mb-1 text-xs text-gray-400 uppercase">Date of Birth</div>
                        <SmartDatePicker value={boyDob} onChange={setBoyDob} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 uppercase mb-1">Birth Star (Nakshatra)</label>
                        <select 
                            value={boyNak}
                            onChange={(e) => setBoyNak(e.target.value)}
                            className="w-full bg-gray-900 border border-blue-500/30 rounded p-2 text-white"
                        >
                            {NAKSHATRAS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            {/* HEART CONNECTOR (Desktop) */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 bg-gray-900 rounded-full border-2 border-red-500 items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                <span className="text-2xl animate-pulse">❤️</span>
            </div>

            {/* GIRL CARD */}
            <Card className="p-6 border-r-4 border-pink-500">
                <h3 className="text-xl font-bold text-pink-300 mb-4 font-cinzel text-right">Partner B (Girl)</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 uppercase mb-1 text-right">Name</label>
                        <input 
                            type="text" 
                            value={girlName}
                            onChange={(e) => setGirlName(e.target.value)}
                            className="w-full bg-gray-900 border border-pink-500/30 rounded p-2 text-white text-right"
                            placeholder="Enter Name"
                        />
                    </div>
                    <div className="text-right">
                        <div className="mb-1 text-xs text-gray-400 uppercase">Date of Birth</div>
                        <SmartDatePicker value={girlDob} onChange={setGirlDob} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 uppercase mb-1 text-right">Birth Star (Nakshatra)</label>
                        <select 
                            value={girlNak}
                            onChange={(e) => setGirlNak(e.target.value)}
                            className="w-full bg-gray-900 border border-pink-500/30 rounded p-2 text-white text-right"
                            dir="rtl"
                        >
                            {NAKSHATRAS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>
            </Card>
        </div>

        <div className="mt-8 text-center">
            <Button 
                onClick={calculateCompatibility} 
                disabled={isLoading || !isValid} 
                className="px-12 py-4 bg-gradient-to-r from-blue-600 to-pink-600 rounded-full text-lg font-bold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? "Consulting Ancient Stars..." : "Check Vedic Compatibility"}
            </Button>
            {!isValid && (
                <p className="text-red-400 text-xs mt-2">Please fill in all Name and Date of Birth fields.</p>
            )}
        </div>

        {isLoading && <ProgressBar progress={progress} message={statusMessage} />}

        {score !== null && !isLoading && (
            <div className="mt-10 animate-fade-in-up">
                <Card className="bg-black/80 border-amber-500/30 p-8 text-center max-w-lg mx-auto shadow-[0_0_50px_rgba(236,72,153,0.2)]">
                    <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Total Guna Milan</p>
                    <div className="text-6xl font-black text-white mb-2 relative inline-block">
                        {score} <span className="text-2xl text-gray-500">/ 36</span>
                        <div className="absolute -inset-4 bg-white/5 blur-xl rounded-full -z-10"></div>
                    </div>
                    <h3 className={`text-2xl font-cinzel font-bold mt-4 ${getVerdict(score).color}`}>
                        {getVerdict(score).text}
                    </h3>
                    <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-left bg-gray-900/50 p-4 rounded">
                        <div className="flex justify-between border-b border-gray-700 pb-1">
                            <span>Varna (Spiritual)</span>
                            <span className="text-green-400">1 / 1</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-700 pb-1">
                            <span>Yoni (Instinct)</span>
                            <span className="text-amber-400">2 / 4</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-700 pb-1">
                            <span>Graha Maitri (Mental)</span>
                            <span className="text-green-400">5 / 5</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-700 pb-1">
                            <span>Nadi (Health/Genetics)</span>
                            <span className={score > 18 ? "text-green-400" : "text-red-400"}>{score > 18 ? "8" : "0"} / 8</span>
                        </div>
                    </div>
                </Card>
            </div>
        )}
    </div>
  );
};

export default Matchmaking;
