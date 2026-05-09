# Frontend Mobile — Kaizen App

React Native (Expo) klient mobilny do platformy Kaizen.

## Stack

- React Native 0.81 + Expo ~54, JavaScript (bez TypeScript)
- Expo Router 6 (file-based routing)
- Zustand (auth state), MMKV (persist)
- Axios (httpClient), expo-image-picker, react-native-toast-message

## Struktura

```
src/
  app/                  # Expo Router — ekrany
    _layout.jsx         # root layout, auth guard (Stack.Protected)
    (auth)/             # login, login-password, access-code
    (tabs)/             # index, create, my-cases, profile
    notifications/      # /notifications
    post/[id]/          # detail, edit, survey, survey-results
  components/           # UI komponenty pogrupowane domenowo (PostList, Comments, ...)
  server/
    httpClient.js       # axios + interceptor refresh tokenu
    services/           # authService, postsService, ... (warstwa API)
  store/
    authStore.js        # Zustand store, persistAuthSession
    storage.js          # opakowanie MMKV (getItem/setItem/removeItem)
  theme/                # colors.js, theme.js
  utils/                # jwt, postStatus, navigation, authHeaders, accessCode, url
  constants/            # apiConfig.js (baseURL), constans.js
```

## Aliasy importów (jsconfig.json)

`src/*`, `components/*`, `constants/*`, `server/*`, `store/*`, `theme/*`, `utils/*`, `assets/*`.
Przykład: `import {useAuthStore} from 'store/authStore'`.

## Uruchamianie

```bash
cd frontend/mobile
npm install
npm run start          # Expo dashboard
npm run ios            # iOS simulator
npm run android        # Android
npm run web            # web preview

# MMKV jest natywny — nie działa w Expo Go.
# Dla świeżego dev clienta:
npx expo prebuild --clean
```

Skrypty `npm run *` ustawiają `EXPO_ROUTER_APP_ROOT=src/app`.

## API i auth

- Base URL liczony dynamicznie w `constants/apiConfig.js`
  (Android emulator → `10.0.2.2`, iOS/web → `localhost`, override przez `EXPO_PUBLIC_API_BASE_URL`)
- `httpClient.js` ma interceptor 401 → automatyczny refresh przez `/api/access/token/refresh/`
  (refresh token w HttpOnly cookie, `withCredentials: true`)
- Klucz MMKV: `MMKV_AUTH_KEY` przechowuje `{accessToken, accessTokenExpiration, user, isAuthenticated, ...}`
- Wszystkie wywołania API idą przez `src/server/services/*` — **nie** używać axios bezpośrednio z ekranów
- Upload zdjęć: base64 (nie multipart)

## Konwencje UI

- Kolory tylko z `theme/colors.js` (primary `#1d2b64`, secondary `#36d1dc`, bg `#f4f6fb`)
- `StyleSheet.create()` lokalnie w komponencie, brak frameworków CSS
- Stany ekranowe — lokalny `useState`; auth — Zustand
- Refresh danych przy wejściu na ekran: `useFocusEffect`
- Toasty przez `react-native-toast-message` (host w `_layout.jsx`)

## Role i UI

- `user.role`: `EMPLOYEE` lub `MANAGER` (z payloadu logowania)
- Tab "Moje sprawy" (`(tabs)/my-cases.jsx`) — managerowie i pracownicy widzą inne dane
  (manager: posty do weryfikacji; employee: własne `TO_VERIFY` / `CANCELLED`)
- Dla pracowników bez tej roli ukrywać taby przez `href: null` w `Tabs.Screen`

## Statusy postów

`TO_VERIFY`, `SUBMITTED`, `IN_PROGRESS`, `IMPLEMENTED`, `CANCELLED` — etykiety i kolory w `utils/postStatus.js`.
