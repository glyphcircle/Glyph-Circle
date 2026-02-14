import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { searchCities, City, getMoonInfo, getLagnaForTime, getSunriseTime, getFamousBirthdays } from '../services/geoService';
import { useTheme } from '../context/ThemeContext';

// --- 1. SMART DATE PICKER ---
interface SmartDatePickerProps {
    value: string;
    onChange: (date: string) => void;
}

export const SmartDatePicker: React.FC<SmartDatePickerProps> = ({ value, onChange }) => {
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';
    const [query, setQuery] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => { setQuery(value); }, [value]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    const getSuggestions = () => {
        const q = query.toLowerCase();
        const suggestions = [];

        if (q.includes("leo")) suggestions.push({ label: "Leo Season (Recent)", value: "2023-08-15", note: "Sun in Leo" });
        if (q.includes("1980")) suggestions.push({ label: "Start of Decade", value: "1980-01-01", note: "Jan 1st" });

        const famous = getFamousBirthdays().filter(p => p.name.toLowerCase().includes(q));
        famous.forEach(f => suggestions.push({ label: f.name, value: f.date, note: "Famous Chart" }));

        if (!q || "today".includes(q)) {
            const today = new Date().toISOString().split('T')[0];
            suggestions.push({ label: "Today (Live Transit)", value: today, note: "Now" });
        }

        return suggestions;
    };

    const handleSelect = (date: string) => {
        onChange(date);
        setIsOpen(false);
    };

    const moonInfo = value ? getMoonInfo(value) : null;

    const dropdown = isOpen && query.length > 0 && !/\d{4}-\d{2}-\d{2}/.test(query) ? ReactDOM.createPortal(
        <div
            className={`fixed border rounded-lg shadow-2xl max-h-64 overflow-y-auto custom-scrollbar ${isLight ? 'bg-white border-gray-300' : 'bg-gray-900 border-amber-500/50 shadow-[0_0_20px_rgba(0,0,0,0.9)]'
                }`}
            style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 9999
            }}
        >
            <div className={`p-2 text-xs uppercase tracking-widest ${isLight ? 'text-gray-600 bg-gray-100' : 'text-gray-500 bg-gray-950/50'
                }`}>Smart Suggestions</div>
            {getSuggestions().map((s, i) => (
                <div
                    key={i}
                    className={`p-3 cursor-pointer flex justify-between items-center transition-colors border-b last:border-0 ${isLight ? 'hover:bg-amber-50 border-gray-200' : 'hover:bg-amber-900/30 border-gray-800'
                        }`}
                    onMouseDown={() => handleSelect(s.value)}
                >
                    <span className={`font-bold ${isLight ? 'text-gray-900' : 'text-amber-100'}`}>{s.label}</span>
                    <div className="text-right">
                        <div className={`text-xs ${isLight ? 'text-amber-600' : 'text-amber-500'}`}>{s.value}</div>
                        <div className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{s.note}</div>
                    </div>
                </div>
            ))}
            {getSuggestions().length === 0 && (
                <div className={`p-3 text-xs italic ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                    Type "Leo", "Gandhi", or select a date...
                </div>
            )}
        </div>,
        document.body
    ) : null;

    return (
        <div className="relative group" ref={wrapperRef}>
            <label className={`block mb-1 font-cinzel text-xs font-bold uppercase tracking-widest ${isLight ? 'text-gray-700' : 'text-amber-200'
                }`}>
                Date of Birth
                {moonInfo && <span className={`ml-2 normal-case font-mono opacity-80 ${isLight ? 'text-purple-600' : 'text-amber-500'
                    }`}>[{moonInfo.sign} Moon]</span>}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="date"
                    className={`w-full p-3 border-2 rounded-lg font-mono text-sm focus:ring-2 focus:outline-none transition-colors ${isLight
                            ? 'bg-white border-gray-300 text-gray-900 focus:border-amber-500 focus:ring-amber-200 placeholder-gray-400'
                            : 'bg-gray-800 border-amber-500/30 text-amber-50 focus:border-amber-500 focus:ring-amber-500/20 placeholder-gray-600'
                        }`}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
                <div className={`absolute right-3 top-3 pointer-events-none ${isLight ? 'text-gray-400' : 'text-amber-500/50'
                    }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>
            {dropdown}
        </div>
    );
};

// --- 2. SMART TIME PICKER ---
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
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const slots = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];

    useEffect(() => {
        if (isOpen && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    const currentLagna = value ? getLagnaForTime(value, date) : null;

    const dropdown = isOpen ? ReactDOM.createPortal(
        <div
            className={`fixed border rounded-lg shadow-2xl max-h-64 overflow-y-auto custom-scrollbar ${isLight ? 'bg-white border-gray-300' : 'bg-gray-900 border-amber-500/50 shadow-[0_0_20px_rgba(0,0,0,0.9)]'
                }`}
            style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 9999
            }}
        >
            <div className={`sticky top-0 border-b p-2 grid grid-cols-2 gap-2 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-900 border-gray-800'
                }`}>
                <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Sunrise: <span className={isLight ? 'text-amber-600' : 'text-amber-400'}>{getSunriseTime(date, 20)}</span>
                </div>
                <div className={`text-xs text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Abhijit: <span className={isLight ? 'text-green-600' : 'text-green-400'}>11:45-12:30</span>
                </div>
            </div>
            <div className={`p-2 text-[10px] uppercase tracking-widest ${isLight ? 'text-gray-600' : 'text-gray-500'
                }`}>Lagna Preview</div>
            {slots.map(time => {
                const lagna = getLagnaForTime(time, date);
                return (
                    <div
                        key={time}
                        className={`p-2 cursor-pointer flex justify-between items-center border-b transition-colors ${isLight ? 'hover:bg-amber-50 border-gray-200' : 'hover:bg-amber-900/30 border-gray-800/50'
                            }`}
                        onMouseDown={() => { onChange(time); setIsOpen(false); }}
                    >
                        <span className={`font-mono ${isLight ? 'text-gray-900' : 'text-amber-100'}`}>{time}</span>
                        <span className={`text-xs ${['Aries', 'Leo', 'Sagittarius'].includes(lagna)
                                ? (isLight ? 'text-red-600' : 'text-red-400')
                                : (isLight ? 'text-blue-600' : 'text-blue-300')
                            }`}>
                            {lagna} Ascendant
                        </span>
                    </div>
                )
            })}
        </div>,
        document.body
    ) : null;

    return (
        <div className="relative">
            <label className={`block mb-1 font-cinzel text-xs font-bold uppercase tracking-widest ${isLight ? 'text-gray-700' : 'text-amber-200'
                }`}>
                Time of Birth
                {currentLagna && <span className={`ml-2 normal-case font-mono opacity-90 ${isLight ? 'text-purple-600' : 'text-purple-400'
                    }`}>[{currentLagna} Lagna]</span>}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="time"
                    className={`w-full p-3 border-2 rounded-lg font-mono text-sm focus:ring-2 focus:outline-none transition-colors ${isLight
                            ? 'bg-white border-gray-300 text-gray-900 focus:border-amber-500 focus:ring-amber-200 placeholder-gray-400'
                            : 'bg-gray-800 border-amber-500/30 text-amber-50 focus:border-amber-500 focus:ring-amber-500/20 placeholder-gray-600'
                        }`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
                <div className={`absolute right-10 top-3 text-[10px] pointer-events-none ${isLight ? 'text-amber-600' : 'text-amber-500/50'
                    }`}>
                    {value && getLagnaForTime(value, date)}
                </div>
            </div>
            {dropdown}
        </div>
    );
};

// --- 3. SMART CITY SEARCH ---
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
    const [coordsDisplay, setCoordsDisplay] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => { setQuery(value); }, [value]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onChange(val);

        if (val.length > 1) {
            setSuggestions(searchCities(val));
            setIsOpen(true);
        } else {
            setSuggestions([]);
            setIsOpen(false);
        }
    };

    const handleSelect = (city: City) => {
        setQuery(`${city.name}, ${city.country}`);
        onChange(`${city.name}, ${city.country}`, { lat: city.lat, lng: city.lng });
        setCoordsDisplay(`${city.lat.toFixed(2)}° N, ${city.lng.toFixed(2)}° E`);
        setIsOpen(false);

        const recents = JSON.parse(localStorage.getItem('glyph_recent_cities') || '[]');
        const newRecents = [city, ...recents.filter((c: City) => c.name !== city.name)].slice(0, 5);
        localStorage.setItem('glyph_recent_cities', JSON.stringify(newRecents));
    };

    const showRecents = () => {
        const recents = JSON.parse(localStorage.getItem('glyph_recent_cities') || '[]');
        setSuggestions(recents);
        setIsOpen(true);
    };

    const dropdown = isOpen ? ReactDOM.createPortal(
        <div
            className={`fixed border rounded-lg shadow-2xl max-h-64 overflow-y-auto custom-scrollbar ${isLight ? 'bg-white border-gray-300' : 'bg-gray-900 border-amber-500/50 shadow-[0_0_20px_rgba(0,0,0,0.9)]'
                }`}
            style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 9999
            }}
        >
            {suggestions.length === 0 && query.length < 2 && (
                <div className={`p-3 text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                    Start typing to search global cities...
                </div>
            )}
            {suggestions.map((city, i) => (
                <div
                    key={i}
                    className={`p-3 cursor-pointer border-b transition-colors ${isLight ? 'hover:bg-amber-50 border-gray-200' : 'hover:bg-amber-900/30 border-gray-800'
                        }`}
                    onMouseDown={() => handleSelect(city)}
                >
                    <div className="flex justify-between items-center">
                        <span className={`font-bold ${isLight ? 'text-gray-900' : 'text-amber-100'}`}>{city.name}</span>
                        <span className={`text-[10px] font-mono ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{city.tz}</span>
                    </div>
                    <div className={`flex justify-between items-center text-xs mt-1 ${isLight ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                        <span>{city.state ? `${city.state}, ` : ''}{city.country}</span>
                        <span>{city.lat.toFixed(2)}, {city.lng.toFixed(2)}</span>
                    </div>
                </div>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div className="relative">
            <label className={`block mb-1 font-cinzel text-xs font-bold uppercase tracking-widest ${isLight ? 'text-gray-700' : 'text-amber-200'
                }`}>
                Place of Birth
                {coordsDisplay && <span className={`ml-2 normal-case font-mono opacity-80 text-[10px] ${isLight ? 'text-green-600' : 'text-green-400'
                    }`}>[{coordsDisplay}]</span>}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    className={`w-full p-3 border-2 rounded-lg font-mono text-sm focus:ring-2 focus:outline-none transition-colors ${isLight
                            ? 'bg-white border-gray-300 text-gray-900 focus:border-amber-500 focus:ring-amber-200 placeholder-gray-400'
                            : 'bg-gray-800 border-amber-500/30 text-amber-50 focus:border-amber-500 focus:ring-amber-500/20 placeholder-gray-600'
                        }`}
                    placeholder="City, Country"
                    value={query}
                    onChange={handleSearch}
                    onFocus={showRecents}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
                <div className={`absolute right-3 top-3 pointer-events-none ${isLight ? 'text-gray-400' : 'text-amber-500/50'
                    }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
            </div>
            {dropdown}
        </div>
    );
};
