import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase';

export const signInWithGoogleSheets = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token for Sheets.');
    }
    
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error) {
    console.error('Google Sheets Sign-In Error:', error);
    throw error;
  }
};
