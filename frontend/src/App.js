import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { Check, Calendar, Sparkles, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";

// Vordefinierte Liste an guten Taten
const GOOD_DEEDS = [
  "Spende heute 5€ an eine Hilfsorganisation deiner Wahl.",
  "Schreibe einer Person, die du schätzt, eine nette Nachricht.",
  "Hilf jemandem ungefragt bei einer kleinen Aufgabe.",
  "Sammle Müll auf, den du auf der Straße siehst.",
  "Rufe ein Familienmitglied an, mit dem du lange nicht gesprochen hast.",
  "Gib einem Obdachlosen etwas zu essen oder einen warmen Kaffee.",
  "Komplimentiere heute drei fremde Menschen.",
  "Halte jemandem die Tür auf und lächle dabei.",
  "Bring deinen Nachbarn selbstgebackene Kekse oder etwas Kleines.",
  "Spende Kleidung, die du nicht mehr trägst.",
  "Bedanke dich bei jemandem, der oft übersehen wird (Postbote, Reinigungskraft).",
  "Lass jemanden in der Schlange vor dir gehen.",
  "Schreibe eine positive Online-Bewertung für ein lokales Geschäft.",
  "Pflanze heute einen Baum oder eine Blume.",
  "Kaufe für die Person hinter dir in der Schlange einen Kaffee.",
  "Schicke einem Freund ein Buch, das dich inspiriert hat.",
  "Organisiere alte Sachen und spende sie an Bedürftige.",
  "Hör jemandem heute wirklich aufmerksam zu.",
  "Teile dein Wissen: Hilf jemandem bei einem Problem.",
  "Verzichte heute auf Kritik und übe dich in Geduld.",
  "Melde dich bei einem alten Freund, den du vermisst.",
  "Gib ein großzügiges Trinkgeld im Restaurant oder Café.",
  "Bring jemandem auf der Arbeit eine kleine Aufmerksamkeit mit.",
  "Schreibe einen handgeschriebenen Dankesbrief.",
  "Lade jemanden Einsamen zu einem gemeinsamen Essen ein.",
  "Unterstütze einen lokalen Künstler oder ein kleines Unternehmen.",
  "Biete an, für einen älteren Nachbarn einkaufen zu gehen.",
  "Schenke jemandem deine volle Aufmerksamkeit ohne Handy.",
  "Mache ein ehrliches Kompliment zu einer Leistung.",
  "Vergib jemandem, der dich verletzt hat.",
  "Erzähle jemandem von seinen positiven Eigenschaften.",
  "Teile dein Mittagessen mit einem Kollegen.",
  "Schicke Blumen an jemanden ohne besonderen Anlass.",
  "Biete einem gestressten Elternteil Hilfe an.",
  "Hinterlasse eine ermutigende Notiz für einen Fremden.",
  "Spende Blut, wenn du kannst.",
  "Gehe heute besonders freundlich mit Servicepersonal um.",
  "Räume etwas auf, das nicht dir gehört.",
  "Überrasche jemanden mit seinem Lieblingsessen.",
  "Nimm dir Zeit für einen Menschen, der gerade Probleme hat.",
];

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

// Heutiges Datum als String (YYYY-MM-DD)
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

// Formatiertes Datum anzeigen
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('de-DE', options);
};

// Monat formatieren
const formatMonth = (date) => {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
};

function App() {
  const [completedDates, setCompletedDates] = useState([]);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = getTodayString();
  const deedIndex = getDeedIndexForDate(new Date());
  const todayDeed = GOOD_DEEDS[deedIndex];

  // Laden der gespeicherten Daten
  useEffect(() => {
    const saved = localStorage.getItem('goodDeeds_completed');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCompletedDates(parsed);
      setTodayCompleted(parsed.includes(today));
    }
  }, [today]);

  // Tat abhaken
  const handleComplete = useCallback(() => {
    if (todayCompleted) return;

    const newCompleted = [...completedDates, today];
    setCompletedDates(newCompleted);
    setTodayCompleted(true);
    localStorage.setItem('goodDeeds_completed', JSON.stringify(newCompleted));
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 600);
    
    toast.success("Großartig! Du hast heute Gutes getan.", {
      description: "Deine gute Tat wurde gespeichert.",
      duration: 3000,
    });
  }, [completedDates, today, todayCompleted]);

  // Kalender-Tage für den aktuellen Monat generieren
  const generateCalendarDays = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Führende leere Tage (Woche beginnt mit Montag)
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, date: null });
    }
    
    // Tage des Monats
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateString = date.toISOString().split('T')[0];
      const isToday = dateString === today;
      const isFuture = date > new Date();
      const isCompleted = completedDates.includes(dateString);
      
      days.push({
        day: d,
        date: dateString,
        isToday,
        isFuture,
        isCompleted,
        deed: GOOD_DEEDS[getDeedIndexForDate(date)]
      });
    }
    
    return days;
  }, [currentMonth, today, completedDates]);

  // Statistiken berechnen
  const totalCompleted = completedDates.length;
  const currentStreak = useCallback(() => {
    let streak = 0;
    const sortedDates = [...completedDates].sort().reverse();
    let checkDate = new Date();
    
    if (!todayCompleted) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    for (const dateStr of sortedDates) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (dateStr === checkStr) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < checkStr) {
        break;
      }
    }
    
    return streak;
  }, [completedDates, todayCompleted]);

  const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <TooltipProvider>
      <div className="app-container" data-testid="app-container">
        <div className="hero-glow" />
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
          <div className="logo-text" data-testid="app-logo">
            Gute Tat
          </div>
          
          {/* Hauptkarte mit täglicher Tat */}
          <div 
            className={`daily-card fade-in ${todayCompleted ? 'completed' : ''} ${showSuccess ? 'success-animation' : ''}`}
            data-testid="daily-card"
          >
            <div className="date-display" data-testid="current-date">
              {formatDate(today)}
            </div>
            
            <p className="deed-text" data-testid="deed-text">
              {todayDeed}
            </p>
            
            <button
              className={`action-btn ${todayCompleted ? 'completed' : ''}`}
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
            <div className="stat-card" data-testid="stat-streak">
              <div className="stat-value">{currentStreak()}</div>
              <div className="stat-label">Tage Serie</div>
            </div>
          </div>
          
          {/* Historie / Kalender */}
          <section className="mt-8 fade-in" style={{ animationDelay: '0.2s' }} data-testid="history-section">
            <div className="section-header">
              <Calendar size={16} />
              <span>Deine Historie</span>
            </div>
            
            {/* Monatsnavigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                className="text-[#52525B] hover:text-[#A1A1AA] transition-colors p-1"
                aria-label="Vorheriger Monat"
                data-testid="prev-month-btn"
              >
                ←
              </button>
              <span className="text-sm text-[#A1A1AA] font-medium" data-testid="current-month">
                {formatMonth(currentMonth)}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                className="text-[#52525B] hover:text-[#A1A1AA] transition-colors p-1"
                aria-label="Nächster Monat"
                data-testid="next-month-btn"
              >
                →
              </button>
            </div>
            
            {/* Wochentage Header */}
            <div className="history-grid mb-1">
              {weekdays.map((day) => (
                <div key={day} className="weekday-header">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Kalender Grid */}
            <div className="history-grid" data-testid="calendar-grid">
              {generateCalendarDays().map((day, index) => (
                day.day ? (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        className={`history-day ${day.isCompleted ? 'completed' : ''} ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''}`}
                        data-testid={`calendar-day-${day.date}`}
                        data-status={day.isCompleted ? 'done' : 'pending'}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="tooltip-content max-w-[200px]">
                      <p className="font-semibold mb-1">{day.day}. {currentMonth.toLocaleDateString('de-DE', { month: 'long' })}</p>
                      <p className="text-xs text-[#A1A1AA]">{day.deed}</p>
                      {day.isCompleted && (
                        <p className="text-xs text-[#2DD4BF] mt-1 flex items-center gap-1">
                          <Check size={12} /> Erledigt
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div key={index} className="history-day" style={{ opacity: 0 }} />
                )
              ))}
            </div>
          </section>
          
          {/* Motivations-Footer */}
          <footer className="mt-auto pt-8 text-center" data-testid="footer">
            <p className="text-xs text-[#52525B]">
              Jeden Tag eine kleine gute Tat macht die Welt ein bisschen besser.
            </p>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default App;
