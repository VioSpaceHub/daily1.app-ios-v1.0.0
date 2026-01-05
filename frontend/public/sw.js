const CACHE_NAME = 'daily-deeds-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico'
];

// API URL - will be replaced during build or use relative
const API_BASE = self.location.origin;

// Install - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push notifications with actions
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || '🌱 Daily Deeds';
  const options = {
    body: data.body || 'Zeit für deine gute Tat!',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'daily-deed',
    vibrate: [200, 100, 200],
    data: {
      ...data.data,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'complete',
        title: '✓ Erledigt'
      },
      {
        action: 'open',
        title: 'Öffnen'
      }
    ],
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification actions
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'complete') {
    // Mark deed as completed via API
    event.waitUntil(
      handleCompleteAction(data)
    );
  } else {
    // Open the app (default action or 'open' action)
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
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
    // Get the stored FCM token
    const token = await getStoredToken();
    
    if (!token) {
      console.log('[SW] No token found, opening app instead');
      if (clients.openWindow) {
        return clients.openWindow('/?action=complete');
      }
      return;
    }
    
    // Get backend URL from data or use default
    const backendUrl = data.backendUrl || 'https://hedija-backend.onrender.com';
    
    // Call the API to mark deed as completed
    const response = await fetch(`${backendUrl}/api/deeds/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
      
      // Notify all clients to refresh their data
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
    // On error, open the app so user can complete manually
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
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result?.value || null);
          };
          
          getRequest.onerror = () => {
            resolve(null);
          };
        } catch (e) {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

// Store FCM token in IndexedDB (called from main app)
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
    
    request.onerror = () => {
      resolve(false);
    };
  });
}
