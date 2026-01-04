import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { Check, Moon, Clock, Share2, ChevronDown, ChevronUp, CheckCircle2, Circle, Bell, BellOff, Award, Smile, Heart, MessageCircle, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Toaster, toast } from "sonner";
import { 
  requestNotificationPermission, 
  registerServiceWorker, 
  onForegroundMessage 
} from "@/lib/firebase";

// Kategorie-Icons für Taten
const getCategoryIcon = (text) => {
  if (text.includes("Lächle") || text.includes("freundlich")) return <Smile size={18} className="deed-icon" />;
  if (text.includes("Salam") || text.includes("Begrüße")) return <MessageCircle size={18} className="deed-icon" />;
  if (text.includes("Subhanallah") || text.includes("Alhamdulillah") || text.includes("Allah")) return <Sparkles size={18} className="deed-icon" />;
  if (text.includes("geduldig") || text.includes("Vergebung")) return <Heart size={18} className="deed-icon" />;
  return <Sparkles size={18} className="deed-icon" />;
};

// Badges für Meilensteine
const getBadges = (totalCompleted) => {
  const badges = [];
  if (totalCompleted >= 7) badges.push({ icon: "🔥", label: "7 Tage", achieved: true });
  if (totalCompleted >= 30) badges.push({ icon: "⭐", label: "30 Tage", achieved: true });
  if (totalCompleted >= 100) badges.push({ icon: "🏆", label: "100 Taten", achieved: true });
  return badges;
};

// Vordefinierte Liste an guten Taten (aus JSON) mit Quellenangabe
const GOOD_DEEDS = [
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
  { text: "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", source: "Sahih Muslim 1009" },
  { text: "Begrüße heute bewusst jemanden mit Salam.", source: "Sahih Muslim 54" },
  { text: "Sprich dreimal Subhanallah mit Bedacht.", source: "Sure 33:41" },
  { text: "Sage bewusst Alhamdulillah für etwas Kleines.", source: "Sure 14:7" },
  { text: "Reagiere heute geduldig statt impulsiv.", source: "Sure 3:134" },
];

// Ramadan-Taten (30 Tage)
const RAMADAN_DEEDS = [
  { day: 1, text: "Erneuere heute bewusst deine Niyya für das Fasten.", source: "Sahih al-Bukhari 1" },
  { day: 2, text: "Achte heute besonders darauf, nichts Verletzendes zu sagen.", source: "Sahih al-Bukhari 1904" },
  { day: 3, text: "Denke heute bewusst an eine Gabe Allahs beim Fasten.", source: "Sure 14:7" },
  { day: 4, text: "Reagiere heute geduldig bei Müdigkeit oder Hunger.", source: "Sure 2:153" },
  { day: 5, text: "Teile Iftar oder ermögliche jemandem das Fastenbrechen.", source: "Sunan at-Tirmidhi 807" },
  { day: 6, text: "Lies mindestens 5 Ayat mit Ruhe.", source: "Sure 2:185" },
  { day: 7, text: "Höre Qurʾan ohne Ablenkung.", source: "Sure 7:204" },
  { day: 8, text: "Bitte Allah über den Tag verteilt um Vergebung.", source: "Sahih Muslim 2702" },
  { day: 9, text: "Gedenke Allah beim Gehen oder Warten.", source: "Sure 33:41" },
  { day: 10, text: "Denke kurz über das Jenseits nach.", source: "Sure 59:18" },
  { day: 11, text: "Vergib heute jemandem innerlich.", source: "Sure 24:22" },
  { day: 12, text: "Sprich heute besonders freundlich mit Familie.", source: "Sahih al-Bukhari 6039" },
  { day: 13, text: "Hilf jemandem vor dem Iftar.", source: "Sahih Muslim 1009" },
  { day: 14, text: "Lächle trotz Müdigkeit bewusst.", source: "Sahih Muslim 1009" },
  { day: 15, text: "Ziehe dich heute bewusst aus Streit zurück.", source: "Sunan Abi Dawud 4800" },
  { day: 16, text: "Bleibe heute zwei Minuten länger im Duʿa.", source: "Sure 2:186" },
  { day: 17, text: "Verrichte zwei Rakʿah extra mit Ruhe.", source: "Sahih Muslim 759" },
  { day: 18, text: "Gedenke Allah kurz vor dem Schlafen.", source: "Sahih al-Bukhari 6311" },
  { day: 19, text: "Habe heute gute Hoffnung auf Allah.", source: "Sahih Muslim 2675" },
  { day: 20, text: "Beginne dein Duʿa heute mit Dank.", source: "Sunan Abi Dawud 1481" },
  { day: 21, text: "Bitte Allah um Vergebung und Nähe.", source: "Sure 97:1-5" },
  { day: 22, text: "Reflektiere leise über dein Herz.", source: "Sure 59:18" },
  { day: 23, text: "Kontaktiere jemanden aus Gutem Willen.", source: "Sahih Muslim 2557" },
  { day: 24, text: "Bitte Allah um Barakah im restlichen Ramadan.", source: "Sure 7:96" },
  { day: 25, text: "Prüfe heute deine Absichten.", source: "Sahih al-Bukhari 1" },
  { day: 26, text: "Bitte Allah, deine Taten anzunehmen.", source: "Sure 2:127" },
  { day: 27, text: "Danke Allah für den Ramadan.", source: "Sure 2:185" },
  { day: 28, text: "Nimm dir eine kleine Tat für danach vor.", source: "Sahih Muslim 783" },
  { day: 29, text: "Bewahre Hoffnung nach Ramadan.", source: "Sure 39:53" },
  { day: 30, text: "Verabschiede Ramadan bewusst im Herzen.", source: "Sahih al-Bukhari 6465" },
];

// Ramadan 2026: 17. Februar Abend bis 20. März
const RAMADAN_START = new Date(2026, 1, 17, 18, 0, 0); // 17. Februar 2026, 18:00 Uhr
const RAMADAN_END = new Date(2026, 2, 20, 23, 59, 59); // 20. März 2026, 23:59 Uhr

// Funktion um basierend auf dem Datum den Index der Tat zu bestimmen
const getDeedIndexForDate = (date) => {
  const dateString = date.toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % GOOD_DEEDS.length;
};

// App-Tag berechnen (06:00 - 05:59 nächster Tag)
const getAppDay = () => {
  const now = new Date();
  const hours = now.getHours();
  if (hours < 6) {
    // Vor 6 Uhr: gehört zum Vortag
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
};

// Formatiertes Datum anzeigen
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('de-DE', options);
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

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const today = getAppDay();
  
  // Ramadan Modus - automatisch oder manuell
  const isRamadanActive = ramadanMode || manualRamadanMode;
  const ramadanDay = getRamadanDay();
  
  // Aktuelle Tat bestimmen
  const getCurrentDeed = useCallback(() => {
    if (isRamadanActive) {
      // Im Ramadan-Modus: Ramadan-Tag verwenden oder Tag 1 als Fallback
      const dayIndex = ramadanDay > 0 ? ramadanDay - 1 : 0;
      const deed = RAMADAN_DEEDS[dayIndex];
      return { text: deed.text, source: deed.source, isRamadan: true, day: ramadanDay > 0 ? ramadanDay : 1 };
    }
    const deedIndex = getDeedIndexForDate(new Date(today));
    const deed = GOOD_DEEDS[deedIndex];
    return { text: deed.text, source: deed.source, isRamadan: false };
  }, [isRamadanActive, ramadanDay, today]);

  const currentDeed = getCurrentDeed();

  // Countdown berechnen (06:00 - 05:59)
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      let nextReset = new Date(now);
      
      // Nächster Reset ist um 06:00 Uhr
      if (now.getHours() >= 6) {
        // Reset ist morgen um 06:00
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

  // Ramadan automatisch aktivieren
  useEffect(() => {
    setRamadanMode(isRamadanPeriod());
  }, []);

  // Firebase Push Notifications Setup
  useEffect(() => {
    const setupNotifications = async () => {
      // Check if notifications are already enabled
      const savedToken = localStorage.getItem('goodDeeds_fcmToken');
      if (savedToken) {
        setFcmToken(savedToken);
        setNotificationsEnabled(true);
      }

      // Register service worker
      await registerServiceWorker();

      // Listen for foreground messages
      try {
        onForegroundMessage((payload) => {
          toast(payload.notification?.title || 'OneSmallThing', {
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

  // Toggle Push Notifications
  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      // Disable notifications
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
      toast("Benachrichtigungen deaktiviert", {
        description: "Du erhältst keine Push-Nachrichten mehr.",
        duration: 3000,
      });
    } else {
      // Enable notifications
      const token = await requestNotificationPermission();
      if (token) {
        // Register token on backend
        try {
          await fetch(`${BACKEND_URL}/api/notifications/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, platform: 'web' }),
          });
          
          localStorage.setItem('goodDeeds_fcmToken', token);
          setFcmToken(token);
          setNotificationsEnabled(true);
          
          toast.success("Benachrichtigungen aktiviert!", {
            description: "Du erhältst täglich eine Erinnerung an deine gute Tat.",
            duration: 4000,
          });

          // Send test notification
          try {
            await fetch(`${BACKEND_URL}/api/notifications/send-test?token=${token}`, {
              method: 'POST',
            });
          } catch (e) {
            console.log('Test notification skipped');
          }
        } catch (error) {
          console.error('Error registering token:', error);
          toast.error("Fehler beim Aktivieren", {
            description: "Bitte versuche es erneut.",
            duration: 3000,
          });
        }
      } else {
        toast.error("Berechtigung verweigert", {
          description: "Bitte erlaube Benachrichtigungen in den Browser-Einstellungen.",
          duration: 4000,
        });
      }
    }
  };

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
  }, [today]);

  // Ramadan Modus toggle
  const toggleRamadanMode = () => {
    const newValue = !manualRamadanMode;
    setManualRamadanMode(newValue);
    localStorage.setItem('goodDeeds_manualRamadan', JSON.stringify(newValue));
    
    if (newValue) {
      toast.success("Ramadan Mubarak!", {
        description: "Ramadan-Modus aktiviert. Möge Allah dein Fasten annehmen.",
        duration: 4000,
      });
    } else {
      toast("Ramadan-Modus deaktiviert", {
        description: "Normale Tages-Taten wieder aktiv.",
        duration: 3000,
      });
    }
  };

  // Tat abhaken
  const handleComplete = useCallback(() => {
    if (todayCompleted) return;

    const newCompleted = [...completedDates, today];
    setCompletedDates(newCompleted);
    setTodayCompleted(true);
    localStorage.setItem('goodDeeds_completed', JSON.stringify(newCompleted));
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 600);
    
    const message = isRamadanActive 
      ? "Möge Allah es annehmen!" 
      : "Großartig! Du hast heute Gutes getan.";
    
    toast.success(message, {
      description: "Deine gute Tat wurde gespeichert.",
      duration: 3000,
    });
  }, [completedDates, today, todayCompleted, isRamadanActive]);

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
      
      days.push({
        date: dateString,
        isCompleted,
        isToday,
        formattedDate: date.toLocaleDateString('de-DE', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        })
      });
    }
    
    return days;
  }, [completedDates, today]);

  // Teilen-Funktion (Web Share API / iOS Share Sheet)
  const handleShare = async () => {
    const shareText = `Heute habe ich eine kleine gute Tat aus der App „OneSmallThing" gemacht.
Vielleicht magst du sie auch tun – möge Allah es von uns annehmen. 🌱

„${currentDeed.text}"

—

„Wer zu einer Rechtleitung einlädt, erhält den gleichen Lohn wie derjenige, der ihr folgt, ohne dass deren Lohn gemindert wird."
— Sahih Muslim 2674`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OneSmallThing - Gute Tat',
          text: shareText,
        });
        toast.success("Möge Allah es belohnen!", {
          description: "Danke fürs Teilen mit guter Absicht.",
          duration: 3000,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Text kopiert!", {
          description: "Du kannst ihn jetzt einfügen und teilen.",
          duration: 3000,
        });
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  // Statistiken berechnen
  const totalCompleted = completedDates.length;

  // Countdown formatieren
  const formatCountdown = () => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`;
  };

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
          {/* Header mit Logo und Ramadan Toggle */}
          <div className="header-row">
            <div className={`logo-text ${isRamadanActive ? 'ramadan-logo' : ''}`} data-testid="app-logo">
              {isRamadanActive ? (
                <>
                  <Moon size={20} className="inline-block mr-2" />
                  Ramadan
                </>
              ) : (
                'Gute Tat'
              )}
            </div>
            
            {/* Ramadan Mode Toggle */}
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
                  {notificationsEnabled 
                    ? "Benachrichtigungen deaktivieren" 
                    : "Tägliche Erinnerung aktivieren"}
                </TooltipContent>
              </Tooltip>

              {/* Ramadan Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Moon size={14} className={`${isRamadanActive ? 'text-[#F59E0B]' : 'text-[#52525B]'}`} />
                    <Switch
                      checked={manualRamadanMode || ramadanMode}
                      onCheckedChange={toggleRamadanMode}
                      disabled={ramadanMode}
                      className="ramadan-switch"
                      data-testid="ramadan-switch"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="tooltip-content">
                  {ramadanMode 
                    ? "Ramadan-Modus automatisch aktiv" 
                    : manualRamadanMode 
                      ? "Ramadan-Modus deaktivieren" 
                      : "Ramadan-Modus aktivieren"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Ramadan Badge */}
          {isRamadanActive && (
            <div className="ramadan-badge fade-in" data-testid="ramadan-badge">
              <Moon size={12} />
              <span>Tag {currentDeed.day} von 30</span>
            </div>
          )}
          
          {/* Hauptkarte mit täglicher Tat */}
          <div 
            className={`daily-card fade-in ${todayCompleted ? 'completed' : ''} ${showSuccess ? 'success-animation' : ''} ${isRamadanActive ? 'ramadan-card' : ''}`}
            data-testid="daily-card"
          >
            <div className="date-display" data-testid="current-date">
              {formatDate(today)}
            </div>
            
            <p className="deed-text" data-testid="deed-text">
              {currentDeed.text}
            </p>
            
            <p className="source-reference" data-testid="source-reference">
              — {currentDeed.source}
            </p>
            
            <button
              className={`action-btn ${todayCompleted ? 'completed' : ''} ${isRamadanActive ? 'ramadan-btn' : ''}`}
              onClick={handleComplete}
              disabled={todayCompleted}
              aria-label={todayCompleted ? "Bereits erledigt" : "Als erledigt markieren"}
              data-testid="complete-button"
            >
              <Check className="check-icon" />
              {todayCompleted ? 'Erledigt!' : 'Erledigt'}
            </button>
          </div>
          
          {/* Statistiken */}
          <div className="stats-container fade-in" style={{ animationDelay: '0.1s' }} data-testid="stats-container">
            <div className="stat-card" data-testid="stat-total">
              <div className="stat-value">{totalCompleted}</div>
              <div className="stat-label">Gute Taten</div>
            </div>
            <div className="stat-card countdown-card" data-testid="stat-countdown">
              <div className="countdown-value" data-testid="countdown-display">
                <Clock size={14} className="countdown-icon" />
                {formatCountdown()}
              </div>
              <div className="stat-label">Nächste Tat</div>
            </div>
          </div>
          
          {/* Teilen Button */}
          <div className="share-section fade-in" style={{ animationDelay: '0.15s' }} data-testid="share-section">
            <button
              className={`share-btn ${isRamadanActive ? 'ramadan-share' : ''}`}
              onClick={handleShare}
              data-testid="share-button"
            >
              <Share2 size={16} />
              <span>Teilen (mit guter Absicht)</span>
            </button>
            <p className="share-hint">Möchtest du jemanden sanft an diese Tat erinnern?</p>
          </div>
          
          {/* Historie - Letzte 10 Tage */}
          <Collapsible
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            className="history-collapsible fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <CollapsibleTrigger asChild>
              <button className="history-trigger" data-testid="history-trigger">
                <span className="history-trigger-text">Letzte 10 Tage</span>
                {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="history-content">
              <div className="history-list" data-testid="history-list">
                {getLast10Days().map((day, index) => (
                  <div 
                    key={day.date} 
                    className={`history-item ${day.isToday ? 'today' : ''}`}
                    data-testid={`history-item-${day.date}`}
                  >
                    <span className="history-date">{day.formattedDate}</span>
                    <div className={`history-status ${day.isCompleted ? 'completed' : 'missed'}`}>
                      {day.isCompleted ? (
                        <CheckCircle2 size={18} className="status-icon completed" />
                      ) : (
                        <XCircle size={18} className="status-icon missed" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          {/* Motivations-Footer */}
          <footer className="mt-auto pt-8 text-center" data-testid="footer">
            <p className="text-xs text-[#52525B]">
              {isRamadanActive 
                ? "Möge Allah dein Fasten und deine guten Taten annehmen." 
                : "Jeden Tag eine kleine gute Tat macht die Welt ein bisschen besser."}
            </p>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default App;
