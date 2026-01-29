-- 🔱 REGISTRY RESTORATION PROTOCOL V40
-- Purges test artifacts and seeds the 16 canonical services

BEGIN;

-- 1. Purge existing artifacts
TRUNCATE TABLE public.services RESTART IDENTITY CASCADE;

-- 2. Seed Canonical Offerings
INSERT INTO public.services (name, status, description, price, path, image) VALUES 
('Kalnirnaye Calendar', 'active', 'Ancient Hindu Panchang with Tithi, Nakshatra, and Shubh Muhurats.', 0, '/calendar', 'photo-1506784919141-14e4c93a3024'),
('Numerology', 'active', 'Uncover the secrets hidden in your name and birth date.', 49, '/numerology', 'photo-1518133910546-b6c2fb7d79e3'),
('Vedic Astrology', 'active', 'Explore your destiny written in the stars and planets.', 99, '/astrology', 'photo-1532667449560-72a95c8d381b'),
('Imperial Tarot', 'active', 'Draw a card and gain insight into your past, present, and future.', 49, '/tarot', 'photo-1505537528343-4dc9b89823f6'),
('AI Palmistry', 'active', 'Read the lines on your hand to understand your character and future.', 49, '/palmistry', 'photo-1542553457-3f92a3449339'),
('AI Face Reading', 'active', 'Discover what your facial features reveal about your personality.', 49, '/face-reading', 'photo-1531746020798-e6953c6e8e04'),
('Ayurvedic Dosha', 'active', 'Analyze your body constitution (Prakriti) and get diet plans.', 59, '/ayurveda', 'photo-1540553016722-983e48a2cd10'),
('Shubh Muhurat', 'active', 'Find the most auspicious time for your sacred activities.', 29, '/muhurat', 'photo-1512411516045-81781292a433'),
('Moon Journal', 'active', 'Track your emotional tides aligned with the lunar phases.', 0, '/moon-journal', 'photo-1515524738708-327f6b0037a2'),
('Cosmic Sync', 'active', 'Compare charts with companions for spiritual compatibility.', 69, '/cosmic-sync', 'photo-1518020382113-a7e8fc38eac9'),
('Voice Oracle', 'active', 'Speak directly to the Sage and receive spoken wisdom.', 0, '/voice-oracle', 'photo-1601306342673-0b6fd4739c38'),
('Gemstones & Mantras', 'active', 'Find your power stone and sacred sound vibrations.', 49, '/gemstones', 'photo-1615485290382-441e4d049cb5'),
('Vedic Matchmaking', 'active', 'Check marital compatibility using the ancient Guna Milan system.', 0, '/matchmaking', 'photo-1634320722359-009d6b2c0024'),
('Dream Analysis', 'active', 'Decode the symbols of your subconscious and find lucky numbers.', 49, '/dream-analysis', 'photo-1520110120314-998844893708'),
('Personal Guidance', 'active', 'Personalized remedies and guidance for your life challenges.', 49, '/remedy', 'photo-1528319725582-ddc096101511'),
('Vedic Store', 'active', 'Authentic Rudraksha, Yantras, and Gemstones for your path.', 0, '/store', 'photo-1600609842388-3e4b489d71c6');

-- 3. Verify
SELECT id, name, path FROM public.services ORDER BY created_at ASC;

COMMIT;