from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Gute Tat API", description="Daily Good Deed Reminder App")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Vordefinierte Liste an guten Taten
GOOD_DEEDS = [
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
]


# Models
class GoodDeed(BaseModel):
    model_config = ConfigDict(extra="ignore")
    index: int
    text: str


class DeedCompletion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    deed_index: int
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DeedCompletionCreate(BaseModel):
    date: str
    deed_index: int


# Routes
@api_router.get("/")
async def root():
    return {"message": "Gute Tat API - Willkommen!"}


@api_router.get("/deeds", response_model=List[GoodDeed])
async def get_all_deeds():
    """Gibt alle verfügbaren guten Taten zurück."""
    return [GoodDeed(index=i, text=deed) for i, deed in enumerate(GOOD_DEEDS)]


@api_router.get("/deed/today", response_model=GoodDeed)
async def get_today_deed():
    """Gibt die gute Tat für heute zurück."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Hash basierend auf dem Datum
    hash_value = 0
    for char in today:
        hash_value = ((hash_value << 5) - hash_value) + ord(char)
        hash_value = hash_value & 0xFFFFFFFF
    
    index = abs(hash_value) % len(GOOD_DEEDS)
    return GoodDeed(index=index, text=GOOD_DEEDS[index])


@api_router.get("/deed/{index}", response_model=GoodDeed)
async def get_deed_by_index(index: int):
    """Gibt eine bestimmte gute Tat zurück."""
    if 0 <= index < len(GOOD_DEEDS):
        return GoodDeed(index=index, text=GOOD_DEEDS[index])
    return GoodDeed(index=0, text=GOOD_DEEDS[0])


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
