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

# Vordefinierte Liste an guten Taten (aus JSON) mit Quellenangabe
GOOD_DEEDS = [
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
    {"text": "Lächle einer Person mit der Absicht, ihr Gutes zu tun.", "source": "Sahih Muslim 1009"},
    {"text": "Begrüße heute bewusst jemanden mit Salam.", "source": "Sahih Muslim 54"},
    {"text": "Sprich dreimal Subhanallah mit Bedacht.", "source": "Sure 33:41"},
    {"text": "Sage bewusst Alhamdulillah für etwas Kleines.", "source": "Sure 14:7"},
    {"text": "Reagiere heute geduldig statt impulsiv.", "source": "Sure 3:134"},
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
