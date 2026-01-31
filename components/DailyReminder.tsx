import React, { useEffect } from 'react';
import { useNotifications } from './PushNotifications';
import { useDb } from '../hooks/useDb';
import { safeStorageInstance } from '../services/supabaseClient';

const DailyReminder: React.FC = () => {
  const { sendNotification, permission, preferences } = useNotifications();
  const { db } = useDb();

  useEffect(() => {
    // Check loop
    const checkNotifications = () => {
      if (permission !== 'granted') return;

      const now = new Date();
      const todayStr = now.toDateString();
      
      // --- 1. Daily Horoscope Reminder (8 AM) ---
      if (preferences.daily) {
          const lastDaily = safeStorageInstance.getItem('glyph_daily_sent_date');
          // Check if it's past 8 AM and we haven't sent it today
          if (now.getHours() >= 8 && lastDaily !== todayStr) {
             sendNotification(
                "🔮 Horoscope Ready",
                "The stars have aligned. Tap to reveal your daily guidance."
             );
             safeStorageInstance.setItem('glyph_daily_sent_date', todayStr);
          }
      }

      // --- 2. New Store Item Notification (12 PM) ---
      if (preferences.store) {
          const lastStore = safeStorageInstance.getItem('glyph_store_sent_date');
          // Trigger around noon
          if (now.getHours() >= 12 && lastStore !== todayStr) {
              const activeItems = db.store_items?.filter((i: any) => i.status === 'active') || [];
              
              if (activeItems.length > 0) {
                  // Pick a random item to feature
                  const item = activeItems[Math.floor(Math.random() * activeItems.length)];
                  sendNotification(
                      "✨ New in Sanctuary",
                      `${item.name} is now available. Discover its mystical properties.`
                  );
                  safeStorageInstance.setItem('glyph_store_sent_date', todayStr);
              }
          }
      }

      // --- 3. Streak/Ritual Reminder (6 PM) ---
      if (preferences.reminders) {
          const lastReminder = safeStorageInstance.getItem('glyph_ritual_sent_date');
          if (now.getHours() >= 18 && lastReminder !== todayStr) {
              sendNotification(
                  "🌙 Evening Ritual",
                  "Complete your daily reflection to maintain your spiritual streak!"
              );
              safeStorageInstance.setItem('glyph_ritual_sent_date', todayStr);
          }
      }
    };

    // Run check immediately on mount, then every minute to catch the time
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, [permission, sendNotification, db, preferences]);

  // Simulate a welcome notification if it's the very first visit with permissions
  useEffect(() => {
     const hasWelcomed = safeStorageInstance.getItem('glyph_welcome_push');
     if (permission === 'granted' && !hasWelcomed && preferences.reminders) {
         setTimeout(() => {
             sendNotification(
                 "✨ Welcome Seeker", 
                 "Your spiritual journey has begun. You will receive cosmic insights based on your preferences."
             );
             safeStorageInstance.setItem('glyph_welcome_push', 'true');
         }, 5000);
     }
  }, [permission, sendNotification, preferences]);

  return null;
};

export default DailyReminder;