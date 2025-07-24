import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { toast } from './toast';

export async function registerForPushNotifications() {
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      status = res.status;
    }
    if (status !== 'granted') {
      toast('Notification permission denied');
      return null;
    }
    if (!Device.isDevice) {
      return null;
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { expoPushToken: token }, { merge: true });
    }
    return token;
  } catch (err) {
    console.log('Push registration error', err);
    return null;
  }
}
