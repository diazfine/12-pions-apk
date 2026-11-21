import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { FacebookLogin } from '@capacitor-community/facebook-login';
import { Capacitor } from '@capacitor/core';
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, FIREBASE_WEB_CLIENT_ID, googleProvider } from '../firebase';

export interface NativeAuthUser {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string;
  provider: 'google' | 'facebook' | 'apple' | 'email' | 'guest';
  firebaseUser?: FirebaseUser;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

let nativeGoogleInitialized = false;
const PLACEHOLDER_FACEBOOK_APP_ID = '123456789012345';

export function mapFirebaseAuthError(err: unknown): AuthError {
  if (err instanceof AuthError) return err;

  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const errorStr =
    err && typeof err === 'object' && 'error' in err
      ? String((err as { error?: unknown }).error || '')
      : '';
  const rawMessage =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Erreur inconnue';
  const combined = `${code} ${errorStr} ${rawMessage}`;

  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === '12501' ||
    /\b12501\b/.test(combined) ||
    /cancel(l)?ed/i.test(combined)
  ) {
    return new AuthError(
      code || '12501',
      'Connexion Google annulée : la fenêtre de sélection de compte a été fermée.'
    );
  }
  if (code === '10' || /\b10\b/.test(combined) || /DEVELOPER_ERROR/i.test(combined)) {
    return new AuthError(
      '10',
      "Configuration Google Android incomplète (Erreur 10 : ajoutez l'empreinte SHA-1 Android de votre APK dans Firebase Console pour com.pions12.app)."
    );
  }
  if (code === '7' || /\b7\b/.test(code) || /NETWORK_ERROR/i.test(combined)) {
    return new AuthError(
      '7',
      'Connexion réseau impossible avec Google Play Services. Vérifiez votre accès Internet puis réessayez.'
    );
  }
  if (code === '12500' || /\b12500\b/.test(combined)) {
    return new AuthError(
      '12500',
      "Connexion Google impossible (Erreur 12500 : vérifiez Google Play Services et l'e-mail d'assistance dans Firebase Console)."
    );
  }
  if (code === '12502' || /\b12502\b/.test(combined)) {
    return new AuthError(
      '12502',
      'Une connexion Google est déjà en cours. Veuillez patienter.'
    );
  }
  if (code === 'auth/popup-blocked') {
    return new AuthError(
      code,
      'La fenêtre Google a été bloquée par le navigateur. Veuillez autoriser les pop-ups puis réessayer.'
    );
  }
  if (code === 'auth/unauthorized-domain') {
    return new AuthError(
      code,
      "Ce domaine Web n'est pas encore autorisé dans Firebase Authentication (Authorized Domains)."
    );
  }
  if (code === 'auth/network-request-failed') {
    return new AuthError(
      code,
      'Connexion réseau impossible. Vérifiez votre accès Internet puis réessayez.'
    );
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return new AuthError(
      code,
      'Un compte existe déjà avec cette adresse e-mail via un autre fournisseur.'
    );
  }

  return new AuthError(
    code || 'auth/unknown',
    `La connexion Google a échoué (${code || rawMessage}).`
  );
}

/**
 * Real Google Authentication:
 * - On Web (Preview / Production URL): opens real Firebase Google Sign-In popup.
 * - On Native Android/iOS (Capacitor): invokes native Google Play Services account picker,
 *   then exchanges the Google ID Token with Firebase Authentication (`signInWithCredential`).
 *
 * Strictly NO fake mock fallback when sign-in fails or is cancelled.
 */
export async function signInWithNativeGoogle(): Promise<NativeAuthUser> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    if (!nativeGoogleInitialized) {
      try {
        await GoogleAuth.initialize({
          clientId: FIREBASE_WEB_CLIENT_ID,
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        });
        nativeGoogleInitialized = true;
      } catch {
        // Plugin may already be initialized from capacitor.config
        nativeGoogleInitialized = true;
      }
    }

    try {
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken;
      if (!idToken) {
        throw new AuthError(
          'auth/missing-native-id-token',
          "Jeton Google manquant. Vérifiez que l'empreinte SHA-1 Android et le Web Client ID sont configurés dans Firebase Console."
        );
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCred = await signInWithCredential(auth, credential);
      const fbUser = userCred.user;

      return {
        id: fbUser.uid,
        name: fbUser.displayName || googleUser.name || 'Champion Google',
        email: fbUser.email || googleUser.email || undefined,
        imageUrl: fbUser.photoURL || googleUser.imageUrl || undefined,
        provider: 'google',
        firebaseUser: fbUser,
      };
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  // Real Web Google Sign-In via Firebase Auth Popup
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    return {
      id: fbUser.uid,
      name: fbUser.displayName || 'Champion Google',
      email: fbUser.email || undefined,
      imageUrl: fbUser.photoURL || undefined,
      provider: 'google',
      firebaseUser: fbUser,
    };
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}

/**
 * Apple Sign-In scaffold (ready for Apple Developer Services ID + @capacitor-community/apple-sign-in + Firebase OAuthProvider('apple.com')).
 * No fake mock success on failure.
 */
export async function signInWithNativeApple(): Promise<NativeAuthUser> {
  throw new AuthError(
    'auth/provider-not-configured',
    "La connexion Apple nécessite l'activation d'Apple Sign-In dans Apple Developer Console et Firebase. Utilisez Google pour synchroniser votre profil dès maintenant."
  );
}

/**
 * Facebook Login scaffold (ready for Meta App ID + Key Hash + Firebase FacebookAuthProvider).
 * On native Android/iOS, exchanges the real Facebook accessToken with Firebase Auth.
 * Strictly NO fake mock fallback on Web or failure.
 */
export async function signInWithNativeFacebook(): Promise<NativeAuthUser> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const configuredAppId =
      (Capacitor as unknown as { config?: { plugins?: { FacebookLogin?: { appId?: string } } } })
        ?.config?.plugins?.FacebookLogin?.appId || PLACEHOLDER_FACEBOOK_APP_ID;
    if (!configuredAppId || configuredAppId === PLACEHOLDER_FACEBOOK_APP_ID) {
      throw new AuthError(
        'auth/provider-not-configured',
        'La connexion Facebook nécessite votre véritable Meta App ID + Key Hash Android. Utilisez Google pour synchroniser votre compte.'
      );
    }
    try {
      const result = await FacebookLogin.login({ permissions: ['email', 'public_profile'] });
      const accessToken = result?.accessToken?.token;
      if (!accessToken) {
        throw new AuthError(
          'auth/facebook-cancelled',
          'Connexion Facebook annulée ou jeton indisponible.'
        );
      }

      const credential = FacebookAuthProvider.credential(accessToken);
      const userCred = await signInWithCredential(auth, credential);
      const fbUser = userCred.user;

      return {
        id: fbUser.uid,
        name: fbUser.displayName || 'Champion Facebook',
        email: fbUser.email || undefined,
        imageUrl: fbUser.photoURL || undefined,
        provider: 'facebook',
        firebaseUser: fbUser,
      };
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  throw new AuthError(
    'auth/provider-not-configured',
    'La connexion Facebook nécessite la configuration Meta App ID + Firebase Facebook Auth. Utilisez Google pour synchroniser votre profil dès maintenant.'
  );
}

/**
 * Email sign-in is disabled until Email/Password provider is enabled in Firebase Console.
 */
export async function signInWithEmail(_email: string, _playerName?: string): Promise<NativeAuthUser> {
  throw new AuthError(
    'auth/provider-not-configured',
    "La connexion par E-mail/Mot de passe n'est pas encore activée dans Firebase Console. Utilisez Google pour synchroniser votre compte en ligne."
  );
}

export async function signOutAllAuth(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore Firebase sign-out network errors
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
    } catch {
      // Ignore if GoogleAuth wasn't signed in natively
    }
  }

  clearSessionToken();
}

export const STORAGE_SESSION_TOKEN = 'auth_session_token';
export const STORAGE_SESSION_USER = 'auth_session_user';

export function saveSessionToken(token: string, user: NativeAuthUser): void {
  try {
    localStorage.setItem(STORAGE_SESSION_TOKEN, token);
    const serializableUser: NativeAuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      provider: user.provider,
    };
    localStorage.setItem(STORAGE_SESSION_USER, JSON.stringify(serializableUser));
    localStorage.setItem('is_first_launch', 'true');
  } catch (err) {
    console.error('Failed to save session token to LocalStorage:', err);
  }
}

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_SESSION_TOKEN);
  } catch {
    return null;
  }
}

export function getSessionUser(): NativeAuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(STORAGE_SESSION_TOKEN);
    localStorage.removeItem(STORAGE_SESSION_USER);
  } catch {
    // Ignore
  }
}
