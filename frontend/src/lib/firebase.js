// Firebase configuration and messaging
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const getFirebaseApp = () => {
  return getApps()[0] || initializeApp(firebaseConfig);
};

// Get messaging instance
export const getFirebaseMessaging = () => {
  const app = getFirebaseApp();
  return getMessaging(app);
};

// Check if running as native iOS app (PWA installed or TestFlight)
const isNativeIOSApp = () => {
  const isStandalone = window.navigator.standalone === true;
  const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent);
  return isStandalone || isIOSWebView;
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    // Check if Notification API is available
    if (!('Notification' in window)) {
      console.log('Notifications not supported in this environment');
      // For native iOS apps, notifications might be handled differently
      if (isNativeIOSApp()) {
        console.log('Running as native iOS app - notifications handled by iOS');
        return 'ios-native-app';
      }
      return null;
    }

    // Check current permission status
    if (Notification.permission === 'denied') {
      console.log('Notifications were previously denied');
      return null;
    }

    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }
    
    const messaging = getFirebaseMessaging();
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
    });
    
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    // Don't return null for native apps - they might handle notifications differently
    if (isNativeIOSApp()) {
      console.log('Native iOS app detected - notification error might be expected');
      return 'ios-native-app';
    }
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  const messaging = getFirebaseMessaging();
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
};

// Register service worker
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export default getFirebaseApp;
