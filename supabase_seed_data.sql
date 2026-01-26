
-- 🔱 GLYPH CIRCLE MASTER SEED SCRIPT
-- Run this in Supabase SQL Editor to populate all tables for testing.

-- 1. CLEANUP (Optional - uncomment to wipe existing test data)
-- TRUNCATE public.services, public.image_assets, public.config, public.store_items, public.payment_methods CASCADE;

-- 2. SERVICES (Core Product Offering)
INSERT INTO public.services (id, name, price, path, status, image, description) VALUES
('calendar', 'Kalnirnaye Calendar', 0, '/calendar', 'active', 'photo-1506784919141-14e4c93a3024', 'Ancient Hindu Panchang with Tithi, Nakshatra, and Shubh Muhurats.'),
('numerology', 'Numerology', 49, '/numerology', 'active', 'photo-1518133910546-b6c2fb7d79e3', 'Uncover the secrets hidden in your name and birth date.'),
('astrology', 'Vedic Astrology', 99, '/astrology', 'active', 'photo-1532667449560-72a95c8d381b', 'Explore your destiny written in the stars and planets.'),
('tarot', 'Imperial Tarot', 49, '/tarot', 'active', 'photo-1505537528343-4dc9b89823f6', 'Draw a card and gain insight into your past, present, and future.'),
('palmistry', 'Palmistry', 49, '/palmistry', 'active', 'photo-1542553457-3f92a3449339', 'Read the lines on your hand to understand your character and future.'),
('face-reading', 'Face Reading', 49, '/face-reading', 'active', 'photo-1531746020798-e6953c6e8e04', 'Discover what your facial features reveal about your personality.'),
('store', 'Vedic Store', 0, '/store', 'active', 'photo-1600609842388-3e4b489d71c6', 'Authentic Rudraksha, Yantras, and Gemstones.');

-- 3. IMAGE ASSETS (Brand & Backgrounds)
INSERT INTO public.image_assets (id, name, path, tags, status) VALUES
('header_logo', 'Main Logo', 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO', ARRAY['brand_logo', 'header'], 'active'),
('home_bg_1', 'Mystic Night', 'https://images.unsplash.com/photo-1531162232855-369463387517', ARRAY['background', 'home_bg'], 'active'),
('home_bg_2', 'Ganesha Nebula', 'https://images.unsplash.com/photo-1605333116398-1c39a3f898e3', ARRAY['background', 'home_bg'], 'active'),
('report_bg_palmistry', 'Palmistry Report BG', 'photo-1542553457-3f92a3449339', ARRAY['report_bg'], 'active'),
('report_bg_face', 'Face Reading Report BG', 'photo-1531746020798-e6953c6e8e04', ARRAY['report_bg'], 'active');

-- 4. SYSTEM CONFIG (App Constants)
INSERT INTO public.config (id, key, value, status) VALUES
('app_title', 'title', 'Glyph Circle', 'active'),
('hover_effect', 'card_hover_opacity', '0.9', 'active'),
('currency_default', 'currency', 'INR', 'active'),
('support_email', 'contact_email', 'support@glyphcircle.com', 'active');

-- 5. STORE ITEMS (Physical/Digital Products)
INSERT INTO public.store_items (id, name, price, category, image_url, stock, status, description) VALUES
('item_rudraksha_5', '5 Mukhi Rudraksha', 299, 'Rudraksha', 'photo-1590387120759-4f86a5578507', 50, 'active', 'Authentic bead for mental peace and health.'),
('item_crystal_quartz', 'Clear Quartz Pyramid', 599, 'Crystals', 'photo-1615485290382-441e4d049cb5', 12, 'active', 'Amplifies energy and spiritual clarity.'),
('item_yantra_shree', 'Shree Yantra (Brass)', 899, 'Yantras', 'photo-1605629232363-2591dd8b7623', 5, 'active', 'Ancient sacred geometry for prosperity.');

-- 6. PAYMENT METHODS (UI Icons)
INSERT INTO public.payment_methods (id, name, logo_url, type, status) VALUES
('pm_paytm', 'Paytm', 'https://raw.githubusercontent.com/justpay/upi-icons/master/png/paytm.png', 'upi', 'active'),
('pm_phonepe', 'PhonePe', 'https://raw.githubusercontent.com/justpay/upi-icons/master/png/phonepe.png', 'upi', 'active'),
('pm_gpay', 'Google Pay', 'https://raw.githubusercontent.com/justpay/upi-icons/master/png/googlepay.png', 'upi', 'active'),
('pm_bhim', 'BHIM', 'https://raw.githubusercontent.com/justpay/upi-icons/master/png/bhim.png', 'upi', 'active');

-- 7. PROMOTION/FEATURED CONTENT
INSERT INTO public.featured_content (id, title, text, image_url, status) VALUES
('feat_solar_eclipse', 'Solar Eclipse Guidance', 'A powerful transformation portal opens this week. Perform Sun meditation to align with your highest dharma.', 'photo-1532667449560-72a95c8d381b', 'active');

-- 8. REPORT FORMATS
INSERT INTO public.report_formats (id, name, url, status) VALUES
('fmt_parchment', 'Ancient Parchment', 'https://www.transparenttextures.com/patterns/handmade-paper.png', 'active'),
('fmt_royal', 'Royal Decree', 'https://www.transparenttextures.com/patterns/pinstriped-suit.png', 'active');

-- 🛡️ 9. USER ELEVATION (REPLACE THE ID BELOW)
-- This ensures your account has Admin permissions and Credits
-- UPDATE public.users SET role = 'admin', credits = 999999 WHERE id = 'PASTE-YOUR-UUID-HERE';
-- INSERT INTO private.user_roles (user_id, role) VALUES ('PASTE-YOUR-UUID-HERE', 'admin') ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
