# Gute Tat - Daily Good Deed Reminder App

## Original Problem Statement
Eine minimalistische App, die täglich eine gute Tat als Erinnerung anzeigt. Die Tat wechselt alle 24 Stunden und kann als erledigt markiert werden.

## User Persona
- Menschen, die sich täglich an kleine gute Taten erinnern lassen möchten
- Nutzer, die ihre Fortschritte in einer Historie verfolgen wollen

## Core Requirements (Static)
- Dunkles Farbschema (Google-inspiriert)
- Tägliche gute Tat (wechselt alle 24h basierend auf Datum-Hash)
- Abhak-Funktion mit visueller Bestätigung
- Kalender-Historie der erledigten Taten
- Lokale Speicherung (localStorage)

## What's Been Implemented (January 2025)
- [x] Dark Theme mit teal/biolumineszenten Akzenten
- [x] 40 vordefinierte gute Taten auf Deutsch
- [x] Täglicher Tat-Wechsel (Datum-basierter Hash)
- [x] Erledigt-Button mit Animation und Toast
- [x] Statistiken (Gesamtzahl, Streak/Serie)
- [x] Kalender-Ansicht mit Monatsnavigation
- [x] Tooltips mit Tat-Details je Tag
- [x] localStorage Persistenz
- [x] Backend API für Taten (optional nutzbar)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Sonner
- Backend: FastAPI, MongoDB
- Storage: localStorage (Frontend), MongoDB (Backend ready)

## P0/P1/P2 Features Remaining
### P2 (Nice to have)
- Push-Benachrichtigungen
- Benutzer-Login für Cloud-Sync
- Eigene Taten hinzufügen
- Teilen-Funktion
