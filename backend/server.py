from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, messaging

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


class NotificationSchedule(BaseModel):
    hour: int = 6  # Default: 06:00 Uhr
    minute: int = 0
    enabled: bool = True


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


# ====== FCM Push Notification Routes ======

@api_router.post("/notifications/register")
async def register_fcm_token(data: FCMTokenRegister):
    """Register FCM token for push notifications."""
    try:
        # Store token in MongoDB
        await db.fcm_tokens.update_one(
            {"token": data.token},
            {
                "$set": {
                    "token": data.token,
                    "device_id": data.device_id,
                    "platform": data.platform,
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
async def send_test_notification(token: str):
    """Send a test notification to a specific device."""
    try:
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
                title="🌱 Deine gute Tat für heute",
                body=deed["text"],
            ),
            data={
                "type": "daily_reminder",
                "deed_index": str(index),
                "source": deed["source"]
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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
