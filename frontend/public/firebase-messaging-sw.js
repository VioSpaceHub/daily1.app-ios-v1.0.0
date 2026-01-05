// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyDpABkVxWLN5fbnD9PztuJmxNAZdijSNQQ",
  authDomain: "daily-deeds-26d7f.firebaseapp.com",
  projectId: "daily-deeds-26d7f",
  storageBucket: "daily-deeds-26d7f.firebasestorage.app",
  messagingSenderId: "42539530248",
  appId: "1:42539530248:web:badff0d78b128f2b02f9bd"
});

const messaging = firebase.messaging();

// Backend URL for API calls
const BACKEND_URL = 'https://hedija-backend.onrender.com';

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || '🌱 Daily Deeds';
  const notificationOptions = {
    body: payload.notification?.body || 'Zeit für deine gute Tat!',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'good-deed-reminder',
    vibrate: [200, 100, 200],
    data: {
      ...payload.data,
      backendUrl: BACKEND_URL
    },
    actions: [
      { action: 'complete', title: '✓ Erledigt' },
      { action: 'open', title: 'Öffnen' }
    ],
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  const action = event.action;
  const notification = event.notification;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'complete') {
    // Mark deed as completed
    event.waitUntil(handleCompleteAction(data));
  } else {
    // Open or focus the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Handle the "Complete" action
async function handleCompleteAction(data) {
  try {
    const token = await getStoredToken();
    
    if (!token) {
      console.log('[SW] No token found, opening app instead');
      if (clients.openWindow) {
        return clients.openWindow('/?action=complete');
      }
      return;
    }
    
    const backendUrl = data.backendUrl || BACKEND_URL;
    
    const response = await fetch(`${backendUrl}/api/deeds/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        date: new Date().toISOString().split('T')[0]
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success notification
      await self.registration.showNotification('✅ Erledigt!', {
        body: 'Deine gute Tat wurde gespeichert. Möge Allah es annehmen.',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'deed-completed',
        vibrate: [100, 50, 100]
      });
      
      // Notify all clients to refresh
      const allClients = await clients.matchAll({ type: 'window' });
      allClients.forEach(client => {
        client.postMessage({
          type: 'DEED_COMPLETED',
          date: result.date
        });
      });
    }
  } catch (error) {
    console.error('[SW] Error completing deed:', error);
    if (clients.openWindow) {
      return clients.openWindow('/?action=complete');
    }
  }
}

// Get stored FCM token from IndexedDB
async function getStoredToken() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('daily-deeds-db', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction('settings', 'readonly');
          const store = transaction.objectStore('settings');
          const getRequest = store.get('fcmToken');
          
          getRequest.onsuccess = () => resolve(getRequest.result?.value || null);
          getRequest.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      };
      
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

// Listen for token storage messages
self.addEventListener('message', (event) => {
  if (event.data?.type === 'STORE_TOKEN') {
    storeToken(event.data.token);
  }
});

async function storeToken(token) {
  return new Promise((resolve) => {
    const request = indexedDB.open('daily-deeds-db', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');
      store.put({ key: 'fcmToken', value: token });
      resolve(true);
    };
    
    request.onerror = () => resolve(false);
  });
}
