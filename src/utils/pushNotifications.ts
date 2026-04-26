import { supabase } from '../supabase';

const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY'; // User should replace this with their real key

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications.');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    console.log('Notification permission granted.');
    return true;
  }
  return false;
};

export const subscribeUserToPush = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if subscription already exists
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    // Subscribe the user
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Save to Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        subscription: subscription.toJSON(),
        user_agent: navigator.userAgent
      });

    if (error) throw error;

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe user to push', error);
    return null;
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
