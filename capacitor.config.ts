import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pions12.app',
  appName: 'D 12 PIONS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#042f2e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#083023',
      overlaysWebView: true,
    },
    ScreenOrientation: {
      orientation: 'PORTRAIT',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '847231920694-h7jrk7nhkq8mdgj3mettu2ome8m9l3t8.apps.googleusercontent.com',
      serverClientId: '847231920694-h7jrk7nhkq8mdgj3mettu2ome8m9l3t8.apps.googleusercontent.com',
      androidClientId: '847231920694-h7jrk7nhkq8mdgj3mettu2ome8m9l3t8.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
    FacebookLogin: {
      appId: '123456789012345',
      autoLogAppEvents: true,
      xfbml: true,
    },
  },
};

export default config;
