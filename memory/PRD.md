# Daily Deeds - Daily Good Deed Reminder PWA

## Original Problem Statement
Eine minimalistische PWA-App, die täglich eine gute Tat als Erinnerung anzeigt. Die Tat wechselt alle 24 Stunden (06:00 - 05:59) und kann als erledigt markiert werden. Die App soll auf islamischen Quellen basieren.

## User Persona
- Muslimische Nutzer, die sich täglich an kleine gute Taten erinnern lassen möchten
- Menschen, die ihre Fortschritte in einer Historie verfolgen wollen
- Internationale Nutzer (Deutsch, Englisch, Bosnisch)

## Core Requirements
- Dunkles Farbschema
- Tägliche gute Tat (wechselt alle 24h um 06:00 Uhr)
- Quellenangabe für jede Tat (Hadith/Quran)
- Abhak-Funktion mit visueller Bestätigung
- Historie der letzten 10 Tage
- Push-Benachrichtigungen mit täglicher Erinnerung
- Mehrsprachigkeit (DE, EN, BS)

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Sonner, Lucide Icons
- **Backend**: FastAPI, MongoDB, Firebase Admin SDK
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **PWA**: Service Workers, Web App Manifest
- **Deployment**: Vercel (Frontend), Render.com (Backend)

---

## What's Been Implemented

### January 2025 - Core Features
- [x] Dark Theme mit grünen Akzenten
- [x] 30 vordefinierte gute Taten mit islamischen Quellen
- [x] Täglicher Tat-Wechsel (Datum-basierter Hash, 06:00-05:59 Zyklus)
- [x] Erledigt-Button mit Animation und Toast
- [x] Countdown-Timer bis zur nächsten Tat
- [x] Historie der letzten 10 Tage (expandierbare Liste)
- [x] Teilen-Funktion (native iOS Share Sheet / Clipboard Fallback)
- [x] localStorage Persistenz
- [x] Backend API für Taten und Completion-Tracking
- [x] Push-Benachrichtigungen (Firebase FCM)
- [x] Tägliche Erinnerung um 06:00 (Cron-Job)
- [x] PWA-Support (Manifest, Service Worker, Icons)
- [x] Ramadan-Modus (30 spezielle Taten)
- [x] Meilenstein-Badges (7 Tage, 30 Tage, 100 Taten)
- [x] Kategorie-Icons für Taten
- [x] Interaktive Push-Benachrichtigungen ("✓ Erledigt" direkt aus Notification)
- [x] **Mehrsprachigkeit (Deutsch, Englisch, Bosnisch)** ← NEU
- [x] **Sprachauswahl über Flaggen-Button** ← NEU

### Language Support (January 5, 2025)
- [x] Ramadan-Toggle ersetzt durch Sprachauswahl-Button
- [x] Dropdown-Menü mit 3 Sprachen: 🇩🇪 Deutsch, 🇬🇧 English, 🇧🇦 Bosanski
- [x] Alle UI-Texte übersetzt (Labels, Buttons, Toasts, Footer)
- [x] 30 gute Taten in allen 3 Sprachen
- [x] 30 Ramadan-Taten in allen 3 Sprachen
- [x] Datumsformat passt sich der Sprache an
- [x] Sprachauswahl wird in localStorage gespeichert

---

## P0/P1/P2 Features Remaining

### P0 (Critical)
- [x] Alle Kernfunktionen implementiert

### P1 (High Priority)
- [ ] Apple App Store Veröffentlichung (PWABuilder/Codemagic)
- [ ] PWABuilder Score verbessern (aktuell 27/44)

### P2 (Nice to have)
- [ ] Benutzer-Login für Cloud-Sync
- [ ] Eigene Taten hinzufügen
- [ ] Statistik-Dashboard
- [ ] Code-Refactoring: App.js in kleinere Komponenten aufteilen

---

## Deployment Info
- **Frontend**: Vercel (https://daily1.app)
- **Backend**: Render.com (https://hedija-backend.onrender.com)
- **Database**: MongoDB Atlas
- **Push Notifications**: Firebase Project `daily-deeds-26d7f`

## Key Files
- `/app/frontend/src/App.js` - Hauptkomponente
- `/app/frontend/src/i18n/translations.js` - Übersetzungen (DE, EN, BS)
- `/app/frontend/src/App.css` - Styling
- `/app/backend/server.py` - FastAPI Backend
- `/app/frontend/public/sw.js` - Service Worker
- `/app/frontend/public/firebase-messaging-sw.js` - Push Notification Handler
