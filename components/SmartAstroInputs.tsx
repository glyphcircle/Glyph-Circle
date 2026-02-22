import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    searchCities, City, getMoonInfo, getLagnaForTime,
    getSunriseTime, getFamousBirthdays
} from '../services/geoService';
import { useTheme } from '../context/ThemeContext';

// ─── Shared Utilities ────────────────────────────────────────────────

/** Recalculate portal dropdown position — called on open, scroll, resize */
function calcDropdownPos(inputRef: React.RefObject<HTMLInputElement>) {
    if (!inputRef.current) return { top: 0, left: 0, width: 0, openUp: false };
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;

    return {
        top: openUp
            ? rect.top + window.scrollY - 4   // will subtract height via CSS
            : rect.bottom + window.scrollY + 4,
        left: Math.max(8, rect.left + window.scrollX),
        width: Math.min(rect.width, window.innerWidth - 16),
        openUp,
    };
}

/** Shared portal dropdown wrapper */
const PortalDropdown: React.FC<{
    pos: { top: number; left: number; width: number; openUp: boolean };
    isLight: boolean;
    children: React.ReactNode;
}> = ({ pos, isLight, children }) => (
    ReactDOM.createPortal(
        <div
            className={`fixed border rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar
                ${isLight
                    ? 'bg-white border-gray-300 shadow-lg'
                    : 'bg-gray-900 border-amber-500/50 shadow-[0_0_30px_rgba(0,0,0,0.9)]'
                }`}
            style={{
                top: pos.openUp ? 'auto' : `${pos.top}px`,
                bottom: pos.openUp ? `${window.innerHeight - pos.top + 8}px` : 'auto',
                left: `${pos.left}px`,
                width: `${pos.width}px`,
                zIndex: 9999,
            }}
        >
            {children}
        </div>,
        document.body
    )
);

/** Shared input base classes */
const getInputClass = (isLight: boolean) =>
    `w-full px-4 py-3 border-2 rounded-xl font-mono text-sm focus:ring-2 focus:outline-none
     transition-colors min-h-[44px] ${isLight
        ? 'bg-white border-gray-300 text-gray-900 focus:border-amber-500 focus:ring-amber-200 placeholder-gray-400'
        : 'bg-gray-800 border-amber-500/30 text-amber-50 focus:border-amber-500 focus:ring-amber-500/20 placeholder-gray-600'
    }`;

const getLabelClass = (isLight: boolean) =>
    `block mb-1 font-cinzel text-xs font-bold uppercase tracking-widest
     ${isLight ? 'text-gray-700' : 'text-amber-200'}`;

// ─── 1. SMART DATE PICKER ────────────────────────────────────────────

interface SmartDatePickerProps {
    value: string;
    onChange: (date: string) => void;
}

export const SmartDatePicker: React.FC<SmartDatePickerProps> = ({ value, onChange }) => {
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';
    const [query, setQuery] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false });

    useEffect(() => { setQuery(value); }, [value]);

    const updatePos = useCallback(() => {
        setPos(calcDropdownPos(inputRef));
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updatePos();
        window.addEventListener('scroll', updatePos, true);
        window.addEventListener('resize', updatePos);
        return () => {
            window.removeEventListener('scroll', updatePos, true);
            window.removeEventListener('resize', updatePos);
        };
    }, [isOpen, updatePos]);

    const getSuggestions = () => {
        const q = query.toLowerCase();
        const suggestions: { label: string; value: string; note: string }[] = [];

        if (q.includes('leo'))
            suggestions.push({ label: 'Leo Season (Recent)', value: '2023-08-15', note: 'Sun in Leo' });
        if (q.includes('1980'))
            suggestions.push({ label: 'Start of Decade', value: '1980-01-01', note: 'Jan 1st' });

        getFamousBirthdays()
            .filter(p => p.name.toLowerCase().includes(q))
            .forEach(f => suggestions.push({ label: f.name, value: f.date, note: 'Famous Chart' }));

        if (!q || 'today'.includes(q)) {
            const today = new Date().toISOString().split('T')[0];
            suggestions.push({ label: 'Today (Live Transit)', value: today, note: 'Now' });
        }

        return suggestions;
    };

    const handleSelect = (date: string) => {
        onChange(date);
        setQuery(date);
        setIsOpen(false);
    };

    const moonInfo = value ? getMoonInfo(value) : null;
    const suggestions = getSuggestions();
    const showDropdown = isOpen && query.length > 0 && !/\d{4}-\d{2}-\d{2}/.test(query);

    return (
        <div className="relative">
            <label className={getLabelClass(isLight)}>
                Date of Birth
                {moonInfo && (
                    <span className={`ml-2 normal-case font-mono opacity-80 ${isLight ? 'text-purple-600' : 'text-amber-500'}`}>
                        [{moonInfo.sign} Moon]
                    </span>
                )}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="date"
                    className={getInputClass(isLight)}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value);
                    }}
                    onFocus={() => { updatePos(); setIsOpen(true); }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 250)}
                    style={{ touchAction: 'manipulation' }}
                />
                <div className={`absolute right-3 top-3.5 pointer-events-none ${isLight ? 'text-gray-400' : 'text-amber-500/50'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>

            {showDropdown && (
                <PortalDropdown pos={pos} isLight={isLight}>
                    <div className={`p-2 text-xs uppercase tracking-widest border-b ${isLight ? 'text-gray-600 bg-gray-50 border-gray-200' : 'text-gray-500 bg-gray-950/80 border-gray-800'}`}>
                        Smart Suggestions
                    </div>
                    {suggestions.length === 0 ? (
                        <div className={`p-3 text-xs italic ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                            Type "Leo", "Gandhi", or select a date...
                        </div>
                    ) : suggestions.map((s, i) => (
                        <div
                            key={i}
                            className={`p-3 cursor-pointer flex justify-between items-center transition-colors border-b last:border-0 min-h-[44px]
                                ${isLight ? 'hover:bg-amber-50 active:bg-amber-100 border-gray-100' : 'hover:bg-amber-900/30 active:bg-amber-900/50 border-gray-800'}`}
                            // ✅ onPointerDown works on both mouse and touch
                            onPointerDown={(e) => { e.preventDefault(); handleSelect(s.value); }}
                        >
                            <span className={`font-bold text-sm ${isLight ? 'text-gray-900' : 'text-amber-100'}`}>
                                {s.label}
                            </span>
                            <div className="text-right ml-2 flex-shrink-0">
                                <div className={`text-xs ${isLight ? 'text-amber-600' : 'text-amber-500'}`}>{s.value}</div>
                                <div className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{s.note}</div>
                            </div>
                        </div>
                    ))}
                </PortalDropdown>
            )}
        </div>
    );
};

// ─── 2. SMART TIME PICKER ────────────────────────────────────────────

interface SmartTimePickerProps {
    value: string;
    date: string;
    onChange: (time: string) => void;
}

export const SmartTimePicker: React.FC<SmartTimePickerProps> = ({ value, date, onChange }) => {
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false });

    const slots = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

    const updatePos = useCallback(() => {
        setPos(calcDropdownPos(inputRef));
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updatePos();
        window.addEventListener('scroll', updatePos, true);
        window.addEventListener('resize', updatePos);
        return () => {
            window.removeEventListener('scroll', updatePos, true);
            window.removeEventListener('resize', updatePos);
        };
    }, [isOpen, updatePos]);

    const currentLagna = value ? getLagnaForTime(value, date) : null;

    return (
        <div className="relative">
            <label className={getLabelClass(isLight)}>
                Time of Birth
                {currentLagna && (
                    <span className={`ml-2 normal-case font-mono opacity-90 ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                        [{currentLagna} Lagna]
                    </span>
                )}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="time"
                    className={getInputClass(isLight)}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => { updatePos(); setIsOpen(true); }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 250)}
                    style={{ touchAction: 'manipulation' }}
                />
                {/* Lagna inline hint — hidden on very small screens to avoid overflow */}
                {value && (
                    <div className={`absolute right-10 top-3.5 text-[10px] pointer-events-none hidden sm:block ${isLight ? 'text-amber-600' : 'text-amber-500/60'}`}>
                        {getLagnaForTime(value, date)}
                    </div>
                )}
            </div>

            {isOpen && (
                <PortalDropdown pos={pos} isLight={isLight}>
                    {/* Sunrise / Abhijit header */}
                    <div className={`sticky top-0 border-b p-2 grid grid-cols-2 gap-2 text-xs ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-900 border-gray-800'}`}>
                        <div className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                            Sunrise: <span className={isLight ? 'text-amber-600' : 'text-amber-400'}>{getSunriseTime(date, 20)}</span>
                        </div>
                        <div className={`text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Abhijit: <span className={isLight ? 'text-green-600' : 'text-green-400'}>11:45–12:30</span>
                        </div>
                    </div>
                    <div className={`p-2 text-[10px] uppercase tracking-widest border-b ${isLight ? 'text-gray-500 border-gray-100' : 'text-gray-500 border-gray-800'}`}>
                        Lagna Preview
                    </div>
                    {slots.map(time => {
                        const lagna = getLagnaForTime(time, date);
                        const isFireSign = ['Aries', 'Leo', 'Sagittarius'].includes(lagna);
                        return (
                            <div
                                key={time}
                                className={`p-3 cursor-pointer flex justify-between items-center border-b last:border-0 transition-colors min-h-[44px]
                                    ${isLight ? 'hover:bg-amber-50 active:bg-amber-100 border-gray-100' : 'hover:bg-amber-900/30 active:bg-amber-900/50 border-gray-800/50'}`}
                                onPointerDown={(e) => { e.preventDefault(); onChange(time); setIsOpen(false); }}
                            >
                                <span className={`font-mono text-sm ${isLight ? 'text-gray-900' : 'text-amber-100'}`}>{time}</span>
                                <span className={`text-xs ${isFireSign
                                    ? (isLight ? 'text-red-600' : 'text-red-400')
                                    : (isLight ? 'text-blue-600' : 'text-blue-300')
                                    }`}>
                                    {lagna} Ascendant
                                </span>
                            </div>
                        );
                    })}
                </PortalDropdown>
            )}
        </div>
    );
};

// ─── 3. SMART CITY SEARCH ────────────────────────────────────────────

interface SmartCitySearchProps {
    value: string;
    onChange: (city: string, coords?: { lat: number; lng: number }) => void;
}

export const SmartCitySearch: React.FC<SmartCitySearchProps> = ({ value, onChange }) => {
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [coordsDisplay, setCoordsDisplay] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false });

    useEffect(() => { setQuery(value); }, [value]);

    const updatePos = useCallback(() => {
        setPos(calcDropdownPos(inputRef));
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updatePos();
        window.addEventListener('scroll', updatePos, true);
        window.addEventListener('resize', updatePos);
        return () => {
            window.removeEventListener('scroll', updatePos, true);
            window.removeEventListener('resize', updatePos);
        };
    }, [isOpen, updatePos]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onChange(val);

        if (val.length > 1) {
            setSuggestions(searchCities(val));
            updatePos();
            setIsOpen(true);
        } else {
            setSuggestions([]);
            setIsOpen(false);
        }
    };

    const handleSelect = (city: City) => {
        const label = `${city.name}, ${city.country}`;
        setQuery(label);
        onChange(label, { lat: city.lat, lng: city.lng });
        setCoordsDisplay(`${city.lat.toFixed(2)}°N, ${city.lng.toFixed(2)}°E`);
        setSuggestions([]);
        setIsOpen(false);

        try {
            const recents = JSON.parse(localStorage.getItem('glyph_recent_cities') || '[]');
            const updated = [city, ...recents.filter((c: City) => c.name !== city.name)].slice(0, 5);
            localStorage.setItem('glyph_recent_cities', JSON.stringify(updated));
        } catch { /* localStorage unavailable */ }
    };

    const showRecents = () => {
        try {
            const recents = JSON.parse(localStorage.getItem('glyph_recent_cities') || '[]');
            if (recents.length > 0) {
                setSuggestions(recents);
                updatePos();
                setIsOpen(true);
            }
        } catch { /* ignore */ }
    };

    return (
        <div className="relative">
            <label className={getLabelClass(isLight)}>
                Place of Birth
                {coordsDisplay && (
                    <span className={`ml-2 normal-case font-mono opacity-80 text-[10px] ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                        [{coordsDisplay}]
                    </span>
                )}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={getInputClass(isLight)}
                    placeholder="City, Country"
                    value={query}
                    onChange={handleSearch}
                    onFocus={showRecents}
                    onBlur={() => setTimeout(() => setIsOpen(false), 250)}
                    style={{ touchAction: 'manipulation' }}
                />
                <div className={`absolute right-3 top-3.5 pointer-events-none ${isLight ? 'text-gray-400' : 'text-amber-500/50'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
            </div>

            {isOpen && suggestions.length > 0 && (
                <PortalDropdown pos={pos} isLight={isLight}>
                    <div className={`p-2 text-[10px] uppercase tracking-widest border-b ${isLight ? 'text-gray-500 bg-gray-50 border-gray-100' : 'text-gray-500 bg-gray-950/80 border-gray-800'}`}>
                        {query.length < 2 ? 'Recent Cities' : 'Search Results'}
                    </div>
                    {suggestions.map((city, i) => (
                        <div
                            key={i}
                            className={`p-3 cursor-pointer border-b last:border-0 transition-colors min-h-[44px]
                                ${isLight ? 'hover:bg-amber-50 active:bg-amber-100 border-gray-100' : 'hover:bg-amber-900/30 active:bg-amber-900/50 border-gray-800'}`}
                            onPointerDown={(e) => { e.preventDefault(); handleSelect(city); }}
                        >
                            <div className="flex justify-between items-center gap-2">
                                <span className={`font-bold text-sm truncate ${isLight ? 'text-gray-900' : 'text-amber-100'}`}>
                                    {city.name}
                                </span>
                                <span className={`text-[10px] font-mono flex-shrink-0 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {city.tz}
                                </span>
                            </div>
                            <div className={`flex justify-between items-center text-xs mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span className="truncate">
                                    {city.state ? `${city.state}, ` : ''}{city.country}
                                </span>
                                <span className="flex-shrink-0 ml-2 font-mono text-[10px]">
                                    {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </PortalDropdown>
            )}
        </div>
    );
};
