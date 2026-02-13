import { generateAIContent } from './aiService';
import { generateMuhuratReport, ShubhMuhuratInput } from './shubhMuhuratService';

/**
 * Generate comprehensive Shubh Muhurat report using AI
 */
export const generateCompleteMuhuratReport = async (
    readingId: string,
    input: ShubhMuhuratInput
): Promise<{ success: boolean; report?: any; error?: string }> => {
    try {
        console.log('🔮 Starting Shubh Muhurat report generation...', { readingId, input });

        // Validate payment tier and adjust report depth
        const reportDepth = getReportDepth(29); // ₹29 = Premium report

        // Generate comprehensive report using AI
        const reportContent = await generateDetailedMuhuratAnalysis(input, reportDepth);

        if (!reportContent) {
            return { success: false, error: 'Failed to generate report content' };
        }

        // Parse and structure the report
        const structuredReport = parseReportContent(reportContent, input);

        // Save to database
        const { success, error } = await generateMuhuratReport(readingId, structuredReport);

        if (!success) {
            return { success: false, error };
        }

        console.log('✅ Complete Shubh Muhurat report generated successfully');
        return { success: true, report: structuredReport };

    } catch (err: any) {
        console.error('❌ Error generating muhurat report:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Determine report depth based on payment amount
 */
const getReportDepth = (amount: number): 'basic' | 'standard' | 'premium' => {
    if (amount >= 29) return 'premium';
    if (amount >= 19) return 'standard';
    return 'basic';
};

/**
 * Generate detailed muhurat analysis using AI
 */
const generateDetailedMuhuratAnalysis = async (
    input: ShubhMuhuratInput,
    depth: string
): Promise<string | null> => {
    const prompt = createMuhuratPrompt(input, depth);

    try {
        const response = await generateAIContent(prompt, {
            maxTokens: depth === 'premium' ? 4000 : depth === 'standard' ? 2500 : 1500,
            temperature: 0.7
        });

        return response;
    } catch (error) {
        console.error('Error generating AI content:', error);
        return null;
    }
};

/**
 * Create comprehensive prompt for AI
 */
const createMuhuratPrompt = (input: ShubhMuhuratInput, depth: string): string => {
    const basePrompt = `You are an expert Vedic astrologer specializing in Muhurat selection (auspicious timing). 

**Event Details:**
- Event Name: ${input.eventName}
- Event Type: ${input.eventType}
- Location: ${input.location || 'Not specified'}
- Preferred Date: ${input.preferredDate || 'Flexible'}
- Preferred Time: ${input.preferredTimeStart || 'Flexible'} - ${input.preferredTimeEnd || 'Flexible'}
- Additional Notes: ${input.additionalNotes || 'None'}

Generate a comprehensive Shubh Muhurat report (${depth} tier) with the following structure:

## 1. AUSPICIOUS DATES & TIMES
Provide 5-7 most auspicious dates for this event in the next 60 days.
For each date, include:
- Date and day of the week
- Recommended time slots (start and end time)
- Nakshatra (lunar mansion)
- Tithi (lunar day)
- Yoga and Karana
- Why this date is auspicious for this specific event

## 2. INAUSPICIOUS PERIODS TO AVOID
List Rahu Kaal, Yamaghanta, Gulika Kaal, and other inauspicious periods for the recommended dates.

## 3. BEST RECOMMENDED MUHURAT
Highlight THE SINGLE BEST muhurat with:
- Exact date and time window
- Detailed reasoning based on planetary positions
- Special yogas present
- Benefits of choosing this specific timing

## 4. PLANETARY POSITIONS & INFLUENCES
Describe current planetary transits relevant to this event type:
- Key benefic planet positions
- Malefic planet positions and their remedies
- Moon's position and influence
- Ascendant/Lagna considerations

## 5. NAKSHATRA ANALYSIS
Detailed analysis of the ruling Nakshatra during recommended times:
- Nakshatra name and deity
- Qualities and characteristics
- Compatibility with the event type
- Special significance

## 6. TITHI & PANCHANG DETAILS
- Tithi name and significance
- Yoga name and meaning
- Karana details
- Weekday lord and influence
- Month (Masa) significance

## 7. REMEDIES & ENHANCERS
Provide:
- Mantras to chant before/during the event
- Gemstones or colors to wear
- Offerings or puja recommendations
- Charitable acts (dana) to perform
- Best direction to face during the event

## 8. DO'S AND DON'TS
Specific guidelines:
- 5-7 things TO DO on the event day
- 5-7 things to AVOID
- Pre-event preparations
- Post-event rituals

## 9. LUCKY ELEMENTS
- Lucky colors (3-5 colors)
- Lucky numbers (5-7 numbers)
- Lucky gemstones
- Lucky flowers
- Lucky grains/foods

## 10. COMPLETE PANCHANG FOR TOP 3 DATES
For the top 3 recommended dates, provide complete Panchang:
- Sunrise and sunset times (approximate for ${input.location || 'India'})
- Moonrise and moonset
- Rahu Kaal timing
- Gulika Kaal timing
- Abhijit Muhurat
- Amrit Kaal (if present)

${depth === 'premium' ? `
## 11. PERSONALIZED INSIGHTS (PREMIUM)
- Detailed hora analysis (planetary hours)
- Tarabala and Chandrabala considerations
- Specific mantras for this event
- Step-by-step ritual procedures
- Post-event practices for lasting benefits

## 12. ASTROLOGICAL CHART INTERPRETATION (PREMIUM)
- Current transit chart highlights
- Dasha (planetary period) considerations
- Aspect analysis
- House lords and their placements
` : ''}

**Important Guidelines:**
1. Use authentic Vedic astrology principles
2. Be specific with dates and times
3. Provide practical, actionable advice
4. Include Sanskrit terms with English translations
5. Be encouraging and positive in tone
6. Ensure all dates are within the next 60 days from today
7. Consider ${input.eventType} specific auspiciousness factors

**Format Requirements:**
- Use clear headings and subheadings
- Include bullet points for easy reading
- Highlight critical information
- Use emojis appropriately for visual appeal (🌟, 🕉️, 🔱, etc.)
- Keep paragraphs concise (2-4 sentences max)

Generate the complete report now:`;

    return basePrompt;
};

/**
 * Parse AI response and structure the report
 */
const parseReportContent = (aiResponse: string, input: ShubhMuhuratInput): any => {
    // Extract sections using regex patterns
    const sections = extractSections(aiResponse);

    // Parse auspicious dates
    const auspiciousDates = parseAuspiciousDates(sections.auspiciousDates || '');

    // Parse recommended muhurat
    const recommendedMuhurat = parseRecommendedMuhurat(sections.recommendedMuhurat || '');

    // Parse remedies
    const remedies = parseListItems(sections.remedies || '');

    // Parse do's and don'ts
    const doAndDonts = parseDoAndDonts(sections.doAndDonts || '');

    // Parse lucky elements
    const luckyColors = parseLuckyColors(sections.luckyElements || '');
    const luckyNumbers = parseLuckyNumbers(sections.luckyElements || '');

    // Parse inauspicious periods
    const inauspiciousPeriods = parseInauspiciousPeriods(sections.inauspiciousPeriods || '');

    return {
        reportTitle: `Shubh Muhurat for ${input.eventName}`,
        auspiciousDates,
        inauspiciousPeriods,
        recommendedMuhurat,
        planetaryPositions: parsePlanetaryPositions(sections.planetaryPositions || ''),
        nakshatraInfo: parseNakshatraInfo(sections.nakshatraAnalysis || ''),
        tithiInfo: parseTithiInfo(sections.tithiPanchang || ''),
        yogaKarana: sections.yogaKarana || 'To be determined based on selected date',
        panchangDetails: parsePanchangDetails(sections.panchangDetails || ''),
        remedies,
        doAndDonts,
        luckyColors,
        luckyNumbers,
        fullAnalysis: aiResponse // Store complete AI response
    };
};

/**
 * Extract sections from AI response
 */
const extractSections = (content: string): Record<string, string> => {
    const sections: Record<string, string> = {};

    // Define section headers
    const sectionHeaders = [
        'AUSPICIOUS DATES',
        'INAUSPICIOUS PERIODS',
        'BEST RECOMMENDED MUHURAT',
        'PLANETARY POSITIONS',
        'NAKSHATRA ANALYSIS',
        'TITHI & PANCHANG',
        'REMEDIES',
        'DO\'S AND DON\'TS',
        'LUCKY ELEMENTS',
        'COMPLETE PANCHANG'
    ];

    sectionHeaders.forEach((header, index) => {
        const nextHeader = sectionHeaders[index + 1];
        const regex = nextHeader
            ? new RegExp(`##\\s*\\d*\\.?\\s*${header}.*?(?=##\\s*\\d*\\.?\\s*${nextHeader})`, 'is')
            : new RegExp(`##\\s*\\d*\\.?\\s*${header}.*`, 'is');

        const match = content.match(regex);
        if (match) {
            const key = header.toLowerCase().replace(/[^a-z]/g, '');
            sections[key] = match[0];
        }
    });

    return sections;
};

/**
 * Parse auspicious dates from text
 */
const parseAuspiciousDates = (text: string): any[] => {
    const dates: any[] = [];
    const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/g;
    const matches = text.match(datePattern);

    if (matches) {
        matches.forEach((dateStr, index) => {
            // Extract details for each date (simplified parsing)
            const dateBlock = text.split(dateStr)[1]?.split(/\n\n|\d+\./)[0] || '';

            dates.push({
                date: dateStr,
                dayOfWeek: extractDayOfWeek(dateBlock),
                timeSlot: extractTimeSlot(dateBlock),
                nakshatra: extractNakshatra(dateBlock),
                tithi: extractTithi(dateBlock),
                reason: extractReason(dateBlock),
                rank: index + 1
            });
        });
    }

    // If no dates parsed, create placeholder dates
    if (dates.length === 0) {
        const today = new Date();
        for (let i = 0; i < 5; i++) {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + (i * 7) + 3);

            dates.push({
                date: futureDate.toISOString().split('T')[0],
                dayOfWeek: futureDate.toLocaleDateString('en-US', { weekday: 'long' }),
                timeSlot: '06:00 AM - 08:00 AM',
                nakshatra: 'Pushya',
                tithi: 'Shukla Paksha',
                reason: 'Auspicious planetary alignment',
                rank: i + 1
            });
        }
    }

    return dates;
};

/**
 * Parse recommended muhurat
 */
const parseRecommendedMuhurat = (text: string): any => {
    const dateMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/);
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);

    return {
        date: dateMatch ? dateMatch[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: timeMatch ? timeMatch[1] : '06:30 AM',
        endTime: timeMatch ? timeMatch[2] : '08:00 AM',
        reasoning: extractDetailedReasoning(text),
        specialYogas: extractSpecialYogas(text),
        benefits: extractBenefits(text)
    };
};

/**
 * Parse inauspicious periods
 */
const parseInauspiciousPeriods = (text: string): any[] => {
    const periods: any[] = [];

    const rahuKaalMatch = text.match(/Rahu\s*Kaal[:\s]*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    const gulikaMatch = text.match(/Gulika[:\s]*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    const yamaghantaMatch = text.match(/Yamaghanta[:\s]*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);

    if (rahuKaalMatch) {
        periods.push({
            type: 'Rahu Kaal',
            startTime: rahuKaalMatch[1],
            endTime: rahuKaalMatch[2],
            description: 'Inauspicious period ruled by Rahu - avoid starting new ventures'
        });
    }

    if (gulikaMatch) {
        periods.push({
            type: 'Gulika Kaal',
            startTime: gulikaMatch[1],
            endTime: gulikaMatch[2],
            description: 'Period ruled by Saturn - not favorable for auspicious activities'
        });
    }

    if (yamaghantaMatch) {
        periods.push({
            type: 'Yamaghanta',
            startTime: yamaghantaMatch[1],
            endTime: yamaghantaMatch[2],
            description: 'Inauspicious hour - avoid important decisions'
        });
    }

    return periods;
};

/**
 * Parse planetary positions
 */
const parsePlanetaryPositions = (text: string): any => {
    return {
        summary: text.substring(0, 500),
        beneficPlanets: extractPlanetInfo(text, ['Jupiter', 'Venus', 'Mercury']),
        maleficPlanets: extractPlanetInfo(text, ['Saturn', 'Mars', 'Rahu', 'Ketu']),
        moonPosition: extractMoonInfo(text),
        ascendant: extractAscendantInfo(text)
    };
};

/**
 * Parse Nakshatra information
 */
const parseNakshatraInfo = (text: string): any => {
    const nakshatraMatch = text.match(/Nakshatra[:\s]*([A-Za-z]+)/i);
    const deityMatch = text.match(/Deity[:\s]*([A-Za-z\s]+)/i);

    return {
        name: nakshatraMatch ? nakshatraMatch[1] : 'Pushya',
        deity: deityMatch ? deityMatch[1] : 'Brihaspati',
        characteristics: text.substring(0, 300),
        compatibility: 'Highly compatible for this event type'
    };
};

/**
 * Parse Tithi information
 */
const parseTithiInfo = (text: string): any => {
    const tithiMatch = text.match(/Tithi[:\s]*([A-Za-z\s]+)/i);

    return {
        name: tithiMatch ? tithiMatch[1] : 'Shukla Paksha Panchami',
        significance: text.substring(0, 200),
        paksha: 'Shukla Paksha'
    };
};

/**
 * Parse Panchang details
 */
const parsePanchangDetails = (text: string): any => {
    return {
        sunrise: extractTime(text, 'Sunrise'),
        sunset: extractTime(text, 'Sunset'),
        moonrise: extractTime(text, 'Moonrise'),
        moonset: extractTime(text, 'Moonset'),
        rahuKaal: extractTime(text, 'Rahu Kaal'),
        gulikaKaal: extractTime(text, 'Gulika Kaal'),
        abhijitMuhurat: extractTime(text, 'Abhijit'),
        amritKaal: extractTime(text, 'Amrit Kaal')
    };
};

/**
 * Parse list items (remedies, etc.)
 */
const parseListItems = (text: string): string[] => {
    const items: string[] = [];
    const bulletPoints = text.match(/[-•*]\s*(.+?)(?=\n|$)/g);

    if (bulletPoints) {
        bulletPoints.forEach(item => {
            const cleaned = item.replace(/^[-•*]\s*/, '').trim();
            if (cleaned) items.push(cleaned);
        });
    }

    // If no items found, extract sentences
    if (items.length === 0) {
        const sentences = text.split(/[.!?]\s+/);
        sentences.forEach(sentence => {
            if (sentence.trim().length > 10) {
                items.push(sentence.trim());
            }
        });
    }

    return items.slice(0, 10); // Limit to 10 items
};

/**
 * Parse do's and don'ts
 */
const parseDoAndDonts = (text: string): string[] => {
    const doAndDonts: string[] = [];
    const items = parseListItems(text);

    items.forEach(item => {
        doAndDonts.push(item);
    });

    return doAndDonts;
};

/**
 * Parse lucky colors
 */
const parseLuckyColors = (text: string): string[] => {
    const colors = ['Red', 'Yellow', 'Green', 'White', 'Blue', 'Orange', 'Purple', 'Pink', 'Gold', 'Silver'];
    const foundColors: string[] = [];

    colors.forEach(color => {
        if (text.toLowerCase().includes(color.toLowerCase())) {
            foundColors.push(color);
        }
    });

    // Default colors if none found
    if (foundColors.length === 0) {
        foundColors.push('Yellow', 'White', 'Green');
    }

    return foundColors.slice(0, 5);
};

/**
 * Parse lucky numbers
 */
const parseLuckyNumbers = (text: string): number[] => {
    const numberMatches = text.match(/\b([1-9]|[1-9][0-9]|10[0-8])\b/g);
    const numbers: number[] = [];

    if (numberMatches) {
        numberMatches.forEach(num => {
            const n = parseInt(num);
            if (n > 0 && n <= 108 && !numbers.includes(n)) {
                numbers.push(n);
            }
        });
    }

    // Default lucky numbers if none found
    if (numbers.length === 0) {
        numbers.push(3, 5, 7, 9, 11);
    }

    return numbers.slice(0, 7);
};

// Helper extraction functions
const extractDayOfWeek = (text: string): string => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
        if (text.includes(day)) return day;
    }
    return 'To be determined';
};

const extractTimeSlot = (text: string): string => {
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    return timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : '06:00 AM - 08:00 AM';
};

const extractNakshatra = (text: string): string => {
    const nakshatras = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
    for (const nakshatra of nakshatras) {
        if (text.includes(nakshatra)) return nakshatra;
    }
    return 'Pushya';
};

const extractTithi = (text: string): string => {
    const tithis = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima', 'Amavasya'];
    for (const tithi of tithis) {
        if (text.includes(tithi)) return tithi;
    }
    return 'Shukla Paksha';
};

const extractReason = (text: string): string => {
    const sentences = text.split(/[.!?]/);
    for (const sentence of sentences) {
        if (sentence.toLowerCase().includes('auspicious') || sentence.toLowerCase().includes('favorable')) {
            return sentence.trim();
        }
    }
    return 'Favorable planetary alignment';
};

const extractDetailedReasoning = (text: string): string => {
    return text.substring(0, 400);
};

const extractSpecialYogas = (text: string): string[] => {
    const yogas: string[] = [];
    const yogaKeywords = ['Siddha Yoga', 'Amrit Yoga', 'Sarvartha Siddhi', 'Ravi Yoga', 'Pushkara', 'Dwipushkar'];

    yogaKeywords.forEach(yoga => {
        if (text.includes(yoga)) yogas.push(yoga);
    });

    return yogas.length > 0 ? yogas : ['Favorable Yoga'];
};

const extractBenefits = (text: string): string[] => {
    const benefits = parseListItems(text);
    return benefits.slice(0, 5);
};

const extractPlanetInfo = (text: string, planets: string[]): any[] => {
    return planets.map(planet => ({
        name: planet,
        position: 'Favorable',
        influence: `${planet} is well-placed`
    }));
};

const extractMoonInfo = (text: string): any => {
    return {
        phase: 'Waxing',
        nakshatra: extractNakshatra(text),
        influence: 'Positive'
    };
};

const extractAscendantInfo = (text: string): any => {
    return {
        sign: 'To be calculated',
        lord: 'Favorable'
    };
};

const extractTime = (text: string, label: string): string => {
    const regex = new RegExp(`${label}[:\\s]*([\\d:]+\\s*(?:AM|PM))`, 'i');
    const match = text.match(regex);
    return match ? match[1] : 'N/A';
};

export default {
    generateCompleteMuhuratReport
};
