from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, messaging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Firebase Admin SDK initialization
firebase_cred_path = ROOT_DIR / 'firebase-admin.json'
if firebase_cred_path.exists() and not firebase_admin._apps:
    cred = credentials.Certificate(str(firebase_cred_path))
    firebase_admin.initialize_app(cred)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Scheduler for daily notifications
scheduler = AsyncIOScheduler()

# Daily notification job
async def send_daily_notification_job():
    """Send daily reminder notifications at 06:00 in user's preferred language."""
    logger = logging.getLogger(__name__)
    logger.info("Starting daily notification job...")
    
    try:
        # Get today's deed index
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        hash_value = 0
        for char in today:
            hash_value = ((hash_value << 5) - hash_value) + ord(char)
            hash_value = hash_value & 0xFFFFFFFF
        index = abs(hash_value) % len(GOOD_DEEDS)
        deed = GOOD_DEEDS[index]
        
        # Get all active tokens grouped by language
        tokens_cursor = db.fcm_tokens.find({"active": True})
        tokens_by_lang = {"de": [], "en": [], "bs": []}
        
        async for doc in tokens_cursor:
            lang = doc.get("language", "de")
            if lang not in tokens_by_lang:
                lang = "de"  # Default fallback
            tokens_by_lang[lang].append(doc["token"])
        
        total_sent = 0
        total_failed = 0
        
        # Send notifications per language
        for lang, tokens in tokens_by_lang.items():
            if not tokens:
                continue
            
            notification_text = NOTIFICATION_TEXTS.get(lang, NOTIFICATION_TEXTS["de"])
            
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=notification_text["title"],
                    body=notification_text["body"],
                ),
                data={
                    "type": "daily_reminder",
                    "deed_index": str(index),
                    "source": deed["source"],
                    "language": lang
                },
                tokens=tokens,
            )
            
            response = messaging.send_each_for_multicast(message)
            total_sent += response.success_count
            total_failed += response.failure_count
            
            logger.info(f"Sent {lang} notifications: {response.success_count} success, {response.failure_count} failed")
            
            # Deactivate failed tokens
            if response.failure_count > 0:
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        failed_token = tokens[idx]
                        await db.fcm_tokens.update_one(
                            {"token": failed_token},
                            {"$set": {"active": False}}
                        )
        
        logger.info(f"Daily notifications complete: {total_sent} sent, {total_failed} failed")
        
    except Exception as e:
        logger.error(f"Error in daily notification job: {e}")

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger = logging.getLogger(__name__)
    
    # Schedule daily notification at 06:00 (Europe/Berlin timezone)
    scheduler.add_job(
        send_daily_notification_job,
        CronTrigger(hour=6, minute=0, timezone='Europe/Berlin'),
        id='daily_notification',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started - Daily notifications scheduled for 06:00 (Europe/Berlin)")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    client.close()
    logger.info("Scheduler and database connection closed")

# Create the main app with lifespan
app = FastAPI(
    title="Gute Tat API", 
    description="Daily Good Deed Reminder App",
    lifespan=lifespan
)

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
    source: str


class DeedCompletion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    deed_index: int
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DeedCompletionCreate(BaseModel):
    date: str
    deed_index: int


# FCM Token Model
class FCMTokenRegister(BaseModel):
    token: str
    device_id: Optional[str] = None
    platform: Optional[str] = "web"
    language: Optional[str] = "de"  # User's preferred language


class NotificationSchedule(BaseModel):
    hour: int = 6  # Default: 06:00 Uhr
    minute: int = 0
    enabled: bool = True


# Multilingual notification texts
NOTIFICATION_TEXTS = {
    "de": {
        "title": "☀️ Daily 1",
        "body": "Deine gute Tat für heute wartet auf dich!"
    },
    "en": {
        "title": "☀️ Daily 1",
        "body": "Your good deed for today is waiting for you!"
    },
    "bs": {
        "title": "☀️ Daily 1",
        "body": "Tvoje dobro djelo za danas te čeka!"
    }
}


# Routes
@api_router.get("/")
async def root():
    return {"message": "Gute Tat API - Willkommen!"}


@api_router.get("/deeds", response_model=List[GoodDeed])
async def get_all_deeds():
    """Gibt alle verfügbaren guten Taten zurück."""
    return [GoodDeed(index=i, text=deed["text"], source=deed["source"]) for i, deed in enumerate(GOOD_DEEDS)]


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
    deed = GOOD_DEEDS[index]
    return GoodDeed(index=index, text=deed["text"], source=deed["source"])


@api_router.get("/deed/{index}", response_model=GoodDeed)
async def get_deed_by_index(index: int):
    """Gibt eine bestimmte gute Tat zurück."""
    if 0 <= index < len(GOOD_DEEDS):
        deed = GOOD_DEEDS[index]
        return GoodDeed(index=index, text=deed["text"], source=deed["source"])
    deed = GOOD_DEEDS[0]
    return GoodDeed(index=0, text=deed["text"], source=deed["source"])


# ====== Deed Completion Routes ======

class CompleteDeedRequest(BaseModel):
    token: str
    date: Optional[str] = None


@api_router.post("/deeds/complete")
async def complete_deed(data: CompleteDeedRequest):
    """Mark a deed as completed for a specific device/token."""
    try:
        # Use provided date or today
        deed_date = data.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Store completion in MongoDB
        await db.deed_completions.update_one(
            {"token": data.token, "date": deed_date},
            {
                "$set": {
                    "token": data.token,
                    "date": deed_date,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        logger.info(f"Deed completed for token {data.token[:20]}... on {deed_date}")
        return {"success": True, "date": deed_date, "message": "Deed marked as completed"}
    except Exception as e:
        logger.error(f"Error completing deed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/deeds/completed/{token}")
async def get_completed_deeds(token: str):
    """Get all completed deeds for a specific device/token."""
    try:
        completions = await db.deed_completions.find(
            {"token": token},
            {"_id": 0, "date": 1}
        ).to_list(length=1000)
        
        dates = [c["date"] for c in completions]
        return {"success": True, "completed_dates": dates}
    except Exception as e:
        logger.error(f"Error getting completed deeds: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ====== FCM Push Notification Routes ======

@api_router.post("/notifications/register")
async def register_fcm_token(data: FCMTokenRegister):
    """Register FCM token for push notifications with language preference."""
    try:
        # Store token in MongoDB with language preference
        await db.fcm_tokens.update_one(
            {"token": data.token},
            {
                "$set": {
                    "token": data.token,
                    "device_id": data.device_id,
                    "platform": data.platform,
                    "language": data.language or "de",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "active": True
                }
            },
            upsert=True
        )
        return {"success": True, "message": "Token registered successfully"}
    except Exception as e:
        logger.error(f"Error registering FCM token: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/notifications/language")
async def update_notification_language(token: str, language: str):
    """Update the language preference for notifications."""
    try:
        if language not in ["de", "en", "bs"]:
            language = "de"
        
        await db.fcm_tokens.update_one(
            {"token": token},
            {"$set": {"language": language}}
        )
        return {"success": True, "message": f"Language updated to {language}"}
    except Exception as e:
        logger.error(f"Error updating language: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/notifications/unregister/{token}")
async def unregister_fcm_token(token: str):
    """Unregister FCM token."""
    try:
        await db.fcm_tokens.update_one(
            {"token": token},
            {"$set": {"active": False}}
        )
        return {"success": True, "message": "Token unregistered"}
    except Exception as e:
        logger.error(f"Error unregistering FCM token: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/notifications/send-test")
async def send_test_notification(token: str, language: str = "de"):
    """Send a test notification to a specific device in their preferred language."""
    try:
        # Get notification text in user's language
        if language not in NOTIFICATION_TEXTS:
            language = "de"
        notification_text = NOTIFICATION_TEXTS[language]
        
        # Get today's deed
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        hash_value = 0
        for char in today:
            hash_value = ((hash_value << 5) - hash_value) + ord(char)
            hash_value = hash_value & 0xFFFFFFFF
        index = abs(hash_value) % len(GOOD_DEEDS)
        deed = GOOD_DEEDS[index]
        
        message = messaging.Message(
            notification=messaging.Notification(
                title=notification_text["title"],
                body=notification_text["body"],
            ),
            data={
                "type": "daily_reminder",
                "deed_index": str(index),
                "source": deed["source"],
                "language": language
            },
            token=token,
        )
        
        response = messaging.send(message)
        logger.info(f"Test notification sent: {response}")
        return {"success": True, "message_id": response}
    except Exception as e:
        logger.error(f"Error sending test notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/notifications/send-daily")
async def send_daily_notifications(background_tasks: BackgroundTasks):
    """Send daily reminder to all registered devices."""
    try:
        # Get today's deed
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        hash_value = 0
        for char in today:
            hash_value = ((hash_value << 5) - hash_value) + ord(char)
            hash_value = hash_value & 0xFFFFFFFF
        index = abs(hash_value) % len(GOOD_DEEDS)
        deed = GOOD_DEEDS[index]
        
        # Get all active tokens
        tokens_cursor = db.fcm_tokens.find({"active": True})
        tokens = [doc["token"] async for doc in tokens_cursor]
        
        if not tokens:
            return {"success": True, "sent": 0, "message": "No active tokens"}
        
        # Send to all tokens
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title="🌱 Deine gute Tat für heute",
                body=deed["text"],
            ),
            data={
                "type": "daily_reminder",
                "deed_index": str(index),
                "source": deed["source"]
            },
            tokens=tokens,
        )
        
        response = messaging.send_each_for_multicast(message)
        logger.info(f"Daily notifications sent: {response.success_count} success, {response.failure_count} failed")
        
        # Handle failed tokens
        if response.failure_count > 0:
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    failed_token = tokens[idx]
                    await db.fcm_tokens.update_one(
                        {"token": failed_token},
                        {"$set": {"active": False}}
                    )
        
        return {
            "success": True,
            "sent": response.success_count,
            "failed": response.failure_count
        }
    except Exception as e:
        logger.error(f"Error sending daily notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
