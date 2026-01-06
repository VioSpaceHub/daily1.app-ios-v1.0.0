import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { Check, Moon, Clock, Share2, ChevronDown, ChevronUp, CheckCircle2, Circle, Bell, BellOff, Smile, Heart, MessageCircle, Sparkles, Sun } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster, toast } from "sonner";
import { 
  requestNotificationPermission, 
  registerServiceWorker, 
  onForegroundMessage 
} from "@/lib/firebase";
import { translations, goodDeeds, ramadanDeeds, languages, dateLocales, bosnianMonths, bosnianWeekdays } from "@/i18n/translations";

// Kategorie-Icons für Taten - Herz, Licht, Sonne
const getCategoryIcon = (text) => {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("lächle") || lowerText.includes("smile") || lowerText.includes("nasmiješi") || lowerText.includes("freundlich") || lowerText.includes("kindly") || lowerText.includes("ljubazno")) 
    return <Smile className="deed-icon" />;
  if (lowerText.includes("salam") || lowerText.includes("selam") || lowerText.includes("begrüß") || lowerText.includes("greet") || lowerText.includes("pozdravi")) 
    return <Sun className="deed-icon" />;
  if (lowerText.includes("subhanallah") || lowerText.includes("alhamdulillah") || lowerText.includes("elhamdulillah") || lowerText.includes("allah")) 
    return <Sparkles className="deed-icon" />;
  if (lowerText.includes("geduldig") || lowerText.includes("patient") || lowerText.includes("strpljiv") || lowerText.includes("vergebung") || lowerText.includes("forgive") || lowerText.includes("oprosti")) 
    return <Heart className="deed-icon" />;
  return <Heart className="deed-icon" />;
};

// Streak Emoji basierend auf der Anzahl
const getStreakEmoji = (streak) => {
  if (streak >= 30) return "🏆";
  if (streak >= 14) return "⭐";
  if (streak >= 7) return "🔥";
  if (streak >= 3) return "✨";
  return "🌱";
};

// Badges für Meilensteine
const getBadges = (totalCompleted, t) => {
  const badges = [];
  if (totalCompleted >= 7) badges.push({ icon: "🔥", label: t.badge7Days, achieved: true });
  if (totalCompleted >= 30) badges.push({ icon: "⭐", label: t.badge30Days, achieved: true });
  if (totalCompleted >= 100) badges.push({ icon: "🏆", label: t.badge100Deeds, achieved: true });
  return badges;
};

// Ramadan 2026: 17. Februar Abend bis 20. März
const RAMADAN_START = new Date(2026, 1, 17, 18, 0, 0);
const RAMADAN_END = new Date(2026, 2, 20, 23, 59, 59);

// Funktion um basierend auf dem Datum den Index der Tat zu bestimmen
const getDeedIndexForDate = (date, deedsLength) => {
  const dateString = date.toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % deedsLength;
};

// App-Tag berechnen (06:00 - 05:59 nächster Tag)
const getAppDay = () => {
  const now = new Date();
  const hours = now.getHours();
  if (hours < 6) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
};

// Prüfen ob aktuell Ramadan ist
const isRamadanPeriod = () => {
  const now = new Date();
  return now >= RAMADAN_START && now <= RAMADAN_END;
};

// Ramadan-Tag berechnen (1-30)
const getRamadanDay = () => {
  const now = new Date();
  if (now < RAMADAN_START || now > RAMADAN_END) return 0;
  
  const startDate = new Date(RAMADAN_START);
  startDate.setHours(0, 0, 0, 0);
  
  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);
  
  const diffTime = currentDate - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return Math.min(Math.max(diffDays, 1), 30);
};

function App() {
  const [completedDates, setCompletedDates] = useState([]);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [ramadanMode, setRamadanMode] = useState(false);
  const [manualRamadanMode, setManualRamadanMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [language, setLanguage] = useState('de');

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  // App Store URL (Placeholder until app is published)
  const APP_STORE_URL = "https://apps.apple.com/app/daily1"; // Placeholder

  // Get translations for current language
  const t = translations[language];
  const currentGoodDeeds = goodDeeds[language];
  const currentRamadanDeeds = ramadanDeeds[language];

  const today = getAppDay();
  
  // Ramadan Modus - automatisch oder manuell
  const isRamadanActive = ramadanMode || manualRamadanMode;
  const ramadanDay = getRamadanDay();

  // Formatiertes Datum anzeigen
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    
    // Manual formatting for Bosnian (browser locale not fully supported)
    if (language === 'bs') {
      const weekday = bosnianWeekdays.long[date.getDay()];
      const day = date.getDate();
      const month = bosnianMonths.long[date.getMonth()];
      const year = date.getFullYear();
      return `${weekday}, ${day}. ${month} ${year}`;
    }
    
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString(dateLocales[language], options);
  }, [language]);
  
  // Aktuelle Tat bestimmen
  const getCurrentDeed = useCallback(() => {
    if (isRamadanActive) {
      const dayIndex = ramadanDay > 0 ? ramadanDay - 1 : 0;
      const deed = currentRamadanDeeds[dayIndex];
      return { text: deed.text, source: deed.source, isRamadan: true, day: ramadanDay > 0 ? ramadanDay : 1 };
    }
    const deedIndex = getDeedIndexForDate(new Date(today), currentGoodDeeds.length);
    const deed = currentGoodDeeds[deedIndex];
    return { text: deed.text, source: deed.source, isRamadan: false };
  }, [isRamadanActive, ramadanDay, today, currentGoodDeeds, currentRamadanDeeds]);

  const currentDeed = getCurrentDeed();

  // Countdown berechnen (06:00 - 05:59)
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      let nextReset = new Date(now);
      
      if (now.getHours() >= 6) {
        nextReset.setDate(nextReset.getDate() + 1);
      }
      nextReset.setHours(6, 0, 0, 0);
      
      const diff = nextReset - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ hours, minutes, seconds });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load saved language
  useEffect(() => {
    const savedLanguage = localStorage.getItem('goodDeeds_language');
    if (savedLanguage && ['de', 'en', 'bs'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Ramadan automatisch aktivieren
  useEffect(() => {
    setRamadanMode(isRamadanPeriod());
  }, []);

  // Firebase Push Notifications Setup
  useEffect(() => {
    const setupNotifications = async () => {
      const savedToken = localStorage.getItem('goodDeeds_fcmToken');
      const hasSeenPrompt = localStorage.getItem('goodDeeds_notificationPromptSeen');
      
      if (savedToken) {
        setFcmToken(savedToken);
        setNotificationsEnabled(true);
      } else if (!hasSeenPrompt) {
        setTimeout(() => setShowNotificationPrompt(true), 2000);
      }

      await registerServiceWorker();

      try {
        onForegroundMessage((payload) => {
          toast(payload.notification?.title || 'Daily Deeds', {
            description: payload.notification?.body,
            duration: 5000,
          });
        });
      } catch (error) {
        console.log('Foreground messaging not available');
      }
    };

    setupNotifications();
  }, []);

  // Handle notification prompt
  const handleNotificationPromptAccept = async () => {
    setShowNotificationPrompt(false);
    localStorage.setItem('goodDeeds_notificationPromptSeen', 'true');
    await toggleNotifications();
  };

  const handleNotificationPromptDismiss = () => {
    setShowNotificationPrompt(false);
    localStorage.setItem('goodDeeds_notificationPromptSeen', 'true');
  };

  // Toggle Push Notifications
  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      if (fcmToken) {
        try {
          await fetch(`${BACKEND_URL}/api/notifications/unregister/${fcmToken}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Error unregistering token:', error);
        }
      }
      localStorage.removeItem('goodDeeds_fcmToken');
      setFcmToken(null);
      setNotificationsEnabled(false);
      toast(t.notificationsDisabled, {
        description: t.notificationsDisabledDesc,
        duration: 3000,
      });
    } else {
      const token = await requestNotificationPermission();
      if (token) {
        try {
          await fetch(`${BACKEND_URL}/api/notifications/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, platform: 'web', language }),
          });
          
          localStorage.setItem('goodDeeds_fcmToken', token);
          setFcmToken(token);
          setNotificationsEnabled(true);
          
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'STORE_TOKEN',
              token: token
            });
          }
          
          toast.success(t.notificationsEnabled, {
            description: t.notificationsEnabledDesc,
            duration: 4000,
          });

          try {
            await fetch(`${BACKEND_URL}/api/notifications/send-test?token=${token}&language=${language}`, {
              method: 'POST',
            });
          } catch (e) {
            console.log('Test notification skipped');
          }
        } catch (error) {
          console.error('Error registering token:', error);
          toast.error(t.enableError, {
            description: t.enableErrorDesc,
            duration: 3000,
          });
        }
      } else {
        toast.error(t.permissionDenied, {
          description: t.permissionDeniedDesc,
          duration: 4000,
        });
      }
    }
  };

  // Update notification language when user changes language
  const updateNotificationLanguage = useCallback(async (newLanguage) => {
    const token = localStorage.getItem('goodDeeds_fcmToken');
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/notifications/language?token=${token}&language=${newLanguage}`, {
          method: 'PUT',
        });
      } catch (error) {
        console.log('Language update skipped');
      }
    }
  }, [BACKEND_URL]);

  // Laden der gespeicherten Daten
  useEffect(() => {
    const saved = localStorage.getItem('goodDeeds_completed');
    const savedManualRamadan = localStorage.getItem('goodDeeds_manualRamadan');
    
    if (saved) {
      const parsed = JSON.parse(saved);
      setCompletedDates(parsed);
      setTodayCompleted(parsed.includes(today));
    }
    
    if (savedManualRamadan) {
      setManualRamadanMode(JSON.parse(savedManualRamadan));
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'DEED_COMPLETED') {
          const completedDate = event.data.date;
          setCompletedDates(prev => {
            if (!prev.includes(completedDate)) {
              const newCompleted = [...prev, completedDate];
              localStorage.setItem('goodDeeds_completed', JSON.stringify(newCompleted));
              return newCompleted;
            }
            return prev;
          });
          if (completedDate === today) {
            setTodayCompleted(true);
          }
          toast.success(t.completed, {
            description: t.deedSavedNotification,
            duration: 3000,
          });
        }
      });
    }
  }, [today, t]);

  // Language change handler
  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    localStorage.setItem('goodDeeds_language', langCode);
    updateNotificationLanguage(langCode);
  };

  // Check if should show review prompt (after 5-7 completed deeds)
  const checkReviewPrompt = useCallback((completedCount) => {
    const hasReviewed = localStorage.getItem('goodDeeds_hasReviewed');
    const reviewDismissed = localStorage.getItem('goodDeeds_reviewDismissed');
    
    if (hasReviewed || reviewDismissed) return;
    
    // Show prompt after 5, 6, or 7 completed deeds
    if (completedCount >= 5 && completedCount <= 7) {
      const shownAt = localStorage.getItem('goodDeeds_reviewShownAt');
      if (!shownAt || parseInt(shownAt) !== completedCount) {
        localStorage.setItem('goodDeeds_reviewShownAt', completedCount.toString());
        setTimeout(() => setShowReviewPrompt(true), 1500);
      }
    }
  }, []);

  // Handle review button click
  const handleReviewClick = () => {
    localStorage.setItem('goodDeeds_hasReviewed', 'true');
    setShowReviewPrompt(false);
    window.open(APP_STORE_URL, '_blank');
  };

  // Handle review later
  const handleReviewLater = () => {
    setShowReviewPrompt(false);
  };

  // Handle never ask again
  const handleReviewNever = () => {
    localStorage.setItem('goodDeeds_reviewDismissed', 'true');
    setShowReviewPrompt(false);
  };

  // Tat abhaken
  const handleComplete = useCallback(async () => {
    if (todayCompleted) return;

    const newCompleted = [...completedDates, today];
    setCompletedDates(newCompleted);
    setTodayCompleted(true);
    localStorage.setItem('goodDeeds_completed', JSON.stringify(newCompleted));
    
    const token = localStorage.getItem('goodDeeds_fcmToken');
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/deeds/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, date: today })
        });
      } catch (e) {
        console.log('Backend sync skipped');
      }
    }
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 600);
    
    const message = isRamadanActive ? t.successRamadan : t.successNormal;
    
    toast.success(message, {
      description: t.deedSaved,
      duration: 3000,
    });

    // Check if we should show review prompt
    checkReviewPrompt(newCompleted.length);
  }, [completedDates, today, todayCompleted, isRamadanActive, t, BACKEND_URL, checkReviewPrompt]);

  // Letzte 10 Tage generieren
  const getLast10Days = useCallback(() => {
    const days = [];
    const now = new Date();
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const isCompleted = completedDates.includes(dateString);
      const isToday = dateString === today;
      
      // Manual formatting for Bosnian
      let formattedDate;
      if (language === 'bs') {
        const weekday = bosnianWeekdays.short[date.getDay()];
        const day = date.getDate();
        const month = bosnianMonths.short[date.getMonth()];
        formattedDate = `${weekday}, ${day}. ${month}`;
      } else {
        formattedDate = date.toLocaleDateString(dateLocales[language], { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        });
      }
      
      days.push({
        date: dateString,
        isCompleted,
        isToday,
        formattedDate
      });
    }
    
    return days;
  }, [completedDates, today, language]);

  // Streak berechnen (aufeinanderfolgende Tage)
  const calculateStreak = useCallback(() => {
    let streak = 0;
    const now = new Date();
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      if (completedDates.includes(dateString)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  }, [completedDates]);

  const currentStreak = calculateStreak();

  // Teilen-Funktion (Web Share API / iOS Share Sheet)
  const handleShare = async () => {
    const shareText = t.shareText.replace('{deed}', currentDeed.text);

    if (navigator.share) {
      try {
        await navigator.share({
          title: t.shareTitle,
          text: shareText,
        });
        toast.success(t.shareSuccess, {
          description: t.shareSuccessDesc,
          duration: 3000,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success(t.textCopied, {
          description: t.textCopiedDesc,
          duration: 3000,
        });
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  // Statistiken berechnen
  const totalCompleted = completedDates.length;
  const badges = getBadges(totalCompleted, t);

  // Motivierender Text für Stats
  const getStatsLabel = () => {
    if (totalCompleted === 0) return t.startToday;
    if (totalCompleted === 1) return t.firstDeed;
    return t.goodDeeds;
  };

  // Countdown formatieren
  const formatCountdown = () => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`;
  };

  // Get current language info
  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <TooltipProvider>
      <div className={`app-container ${isRamadanActive ? 'ramadan-active' : ''}`} data-testid="app-container">
        <div className={`hero-glow ${isRamadanActive ? 'ramadan-glow' : ''}`} />
        <Toaster 
          position="top-center" 
          theme="dark"
          toastOptions={{
            style: {
              background: '#1E1E1E',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#EDEDED',
            },
          }}
        />
        
        <main className="main-content">
          {/* Notification Prompt Modal */}
          {showNotificationPrompt && (
            <div className="notification-prompt-overlay">
              <div className="notification-prompt">
                <div className="prompt-icon">🔔</div>
                <h3>{t.dailyReminder}</h3>
                <p>{t.reminderQuestion}</p>
                <div className="prompt-buttons">
                  <button className="prompt-btn primary" onClick={handleNotificationPromptAccept} data-testid="notification-accept">
                    {t.yesRemindMe}
                  </button>
                  <button className="prompt-btn secondary" onClick={handleNotificationPromptDismiss} data-testid="notification-dismiss">
                    {t.later}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Review Prompt Modal */}
          {showReviewPrompt && (
            <div className="notification-prompt-overlay" data-testid="review-prompt-overlay">
              <div className="notification-prompt review-prompt">
                <div className="prompt-icon">⭐</div>
                <h3>{t.reviewTitle}</h3>
                <p>{t.reviewQuestion}</p>
                <p className="review-subtext">{t.reviewSubtext}</p>
                <div className="prompt-buttons">
                  <button className="prompt-btn primary" onClick={handleReviewClick} data-testid="review-accept">
                    {t.reviewButton}
                  </button>
                  <button className="prompt-btn secondary" onClick={handleReviewLater} data-testid="review-later">
                    {t.reviewLater}
                  </button>
                  <button className="prompt-btn tertiary" onClick={handleReviewNever} data-testid="review-never">
                    {t.reviewNever}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header mit Logo und Sprachauswahl */}
          <div className="header-row">
            <div className={`logo-text ${isRamadanActive ? 'ramadan-logo' : ''}`} data-testid="app-logo">
              {isRamadanActive ? (
                <>
                  <Moon size={22} className="logo-icon" />
                  <span>{t.ramadanTitle}</span>
                </>
              ) : (
                <>
                  <img src="/logo-green.svg" alt="" className="logo-img" />
                  <span>{t.appName}</span>
                </>
              )}
            </div>
            
            {/* Header Actions */}
            <div className="header-actions" data-testid="header-actions">
              {/* Notification Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className={`notification-btn ${notificationsEnabled ? 'active' : ''}`}
                    onClick={toggleNotifications}
                    data-testid="notification-toggle"
                  >
                    {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="tooltip-content">
                  {notificationsEnabled ? t.disableNotifications : t.enableNotifications}
                </TooltipContent>
              </Tooltip>

              {/* Language Selector */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="language-btn"
                        data-testid="language-selector"
                      >
                        <span className="flag-icon">{currentLang.flag}</span>
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="tooltip-content">
                    {t.selectLanguage}
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="language-dropdown">
                  {languages.map((lang) => (
                    <DropdownMenuItem 
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`language-option ${language === lang.code ? 'active' : ''}`}
                      data-testid={`language-option-${lang.code}`}
                    >
                      <span className="flag-icon">{lang.flag}</span>
                      <span className="lang-name">{lang.name}</span>
                      {language === lang.code && <Check size={14} className="check-mark" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Ramadan Badge */}
          {isRamadanActive && (
            <div className="ramadan-badge fade-in" data-testid="ramadan-badge">
              <Moon size={12} />
              <span>{t.ramadanDay.replace('{day}', currentDeed.day)}</span>
            </div>
          )}
          
          {/* Hauptkarte mit täglicher Tat - VERGRÖSSERT & ZENTRIERT */}
          <div 
            className={`daily-card fade-in ${todayCompleted ? 'completed' : ''} ${showSuccess ? 'success-animation' : ''} ${isRamadanActive ? 'ramadan-card' : ''}`}
            data-testid="daily-card"
          >
            <div className="todays-deed-label" data-testid="todays-deed-label">
              {t.todaysDeed}
            </div>
            
            <div className="date-display" data-testid="current-date">
              {formatDate(today)}
            </div>
            
            <div className="deed-content">
              <div className="deed-icon-wrapper">
                {getCategoryIcon(currentDeed.text)}
              </div>
              <p className="deed-text" data-testid="deed-text">
                {currentDeed.text}
              </p>
            </div>
            
            <p className="source-reference" data-testid="source-reference">
              — {currentDeed.source}
            </p>
            
            <button
              className={`action-btn ${todayCompleted ? 'completed' : ''} ${isRamadanActive ? 'ramadan-btn' : ''}`}
              onClick={handleComplete}
              disabled={todayCompleted}
              aria-label={todayCompleted ? t.alreadyCompleted : t.markAsComplete}
              data-testid="complete-button"
            >
              <Check className="check-icon" />
              {todayCompleted ? t.completed : t.markComplete}
            </button>
          </div>
          
          {/* Badges */}
          {badges.length > 0 && (
            <div className="badges-container fade-in" data-testid="badges">
              {badges.map((badge, index) => (
                <div key={index} className="badge">
                  <span className="badge-icon">{badge.icon}</span>
                  <span className="badge-label">{badge.label}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Countdown Section - MIT TEXT */}
          <div className="countdown-section fade-in" style={{ animationDelay: '0.1s' }} data-testid="countdown-section">
            <div className="countdown-label">{t.nextDeedIn}</div>
            <div className="countdown-display">
              <Clock size={20} className="clock-icon-animated" />
              <span className="countdown-value" data-testid="countdown-display">
                {formatCountdown()}
              </span>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="stats-row fade-in" style={{ animationDelay: '0.15s' }} data-testid="stats-container">
            <div className="stat-card" data-testid="stat-total">
              <div className="stat-value">{totalCompleted}</div>
              <div className="stat-label">{getStatsLabel()}</div>
            </div>
            <div className="stat-card" data-testid="stat-streak">
              <div className="stat-value">{currentStreak}</div>
              <div className="stat-label">{t.currentStreak}</div>
            </div>
          </div>
          
          {/* Teilen Button - MOTIVIEREND */}
          <div className="share-section fade-in" style={{ animationDelay: '0.2s' }} data-testid="share-section">
            <button
              className={`share-btn ${isRamadanActive ? 'ramadan-share' : ''}`}
              onClick={handleShare}
              data-testid="share-button"
            >
              <span className="share-icon">
                <Heart size={14} />
                <Share2 size={16} />
              </span>
              <span>{t.share}</span>
            </button>
          </div>
          
          {/* Fortschritt/Historie - GAMIFIZIERT */}
          <Collapsible
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            className="history-collapsible fade-in"
            style={{ animationDelay: '0.25s' }}
          >
            <CollapsibleTrigger asChild>
              <button className="history-trigger" data-testid="history-trigger">
                <div className="history-trigger-content">
                  <span>{t.last10Days}</span>
                  {currentStreak > 0 && (
                    <span className="streak-indicator">
                      {getStreakEmoji(currentStreak)} {currentStreak} {t.streakDays}
                    </span>
                  )}
                </div>
                {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="history-content">
              <div className="history-list" data-testid="history-list">
                {getLast10Days().map((day, index) => (
                  <div 
                    key={day.date} 
                    className={`history-item ${day.isToday ? 'today' : ''} ${day.isCompleted ? 'completed-day' : ''}`}
                    data-testid={`history-item-${day.date}`}
                  >
                    <span className="history-date">{day.formattedDate}</span>
                    <div className="history-status">
                      {day.isCompleted ? (
                        <>
                          <CheckCircle2 size={18} className="status-icon completed" />
                          <span className="streak-emoji">{getStreakEmoji(currentStreak)}</span>
                        </>
                      ) : (
                        <Circle size={18} className="status-icon pending" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          {/* Footer - HADITH */}
          <footer className="app-footer" data-testid="footer">
            <p className="footer-quote">
              {isRamadanActive ? t.footerRamadan : t.footerNormal}
            </p>
            {!isRamadanActive && (
              <p className="footer-source">{t.footerSource}</p>
            )}
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default App;
