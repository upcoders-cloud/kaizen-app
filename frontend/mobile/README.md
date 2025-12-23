# 📱 Mobile App

A React Native application powered by **Expo**, built as part of the **UPCODERS** improvement-idea platform. The mobile app is designed for employees to anonymously submit improvement ideas, like, and comment.

---

## 🚀 Tech Stack

* **React Native**
* **Expo**
* **Axios** — API communication
* **React Navigation** — screen navigation
* **Expo Image Picker** — photo attachments
* **Zustand** — state manager
* **MMKV** — key/value storage

---

## 📂 Project Structure

```
/mobile
  /assets
  /scripts
  /src
    /app
    /components   
    /constans   
    /server
    /store
    /theme
    /utils
```

---

## 🧰 Prerequisites

Make sure you have:

* **Node.js 18+**
* **npm**
* **Expo CLI** (installed automatically)
* **Expo Go** app on your phone

Optional:

* Docker (for backend)
* Running backend on `http://localhost:8000`

---

## ▶️ Running the App

This project uses **npm** for installing packages, **Expo** for running the app, and **MMKV** (`react-native-mmkv`) as a native key/value storage. MMKV is a native module, so it works in a **custom dev client** or a **native build** (Expo Go does not include it by default).

### 1️⃣ Install dependencies (npm)

```
cd /workspace/kaizen-app/frontend/mobile
npm install
```

* **npm** installs all dependencies from `package.json` (Expo SDK, React Native, MMKV, Zustand, Axios, etc.).

### 2️⃣ Start Expo (development)

Use the built-in scripts (they set `EXPO_ROUTER_APP_ROOT=src/app`):

```
npm run start
```

Or target a specific platform:

```
npm run android
npm run ios
npm run web
```

This opens the Expo dashboard.

### 3️⃣ Run on mobile device (Expo + MMKV)

Because **MMKV** is a native module:

* **Expo Go** will **not** load MMKV.
* Generate native projects with **prebuild** and then use a custom dev client or native build.

Required prebuild step:

```
npx expo prebuild --clean
```

This creates fresh native projects, and the app should then be run from the newly generated native app (custom dev client or native build).

Then use a **custom dev client** or a **native build** (e.g., `expo run:android` / `expo run:ios` or EAS build).

After launching a dev client:

* Scan the QR code or select the running device.
* The app reloads live on save.

### 4️⃣ Run in browser (web)

```
npm run web
```

---

## 🔌 API Configuration

Backend requests go through `src/services/api.js`.

Default config:

```
export const api = axios.create({
  baseURL: "http://localhost:8000/api",
});
```
---

## 🛠️ Development Notes

* Project uses **JavaScript only** (no TypeScript)
* Fully works without Xcode — mobile testing via Expo Go
* Recommended editors: WebStorm or VS Code

---

## 📦 Building for Production

```
npx expo build:android
npx expo build:ios
```

(Requires Expo account)

---

## 🧑‍💻 Contributors

* **Pawel Biniak** — Frontend (React Native)
* **Michał Patz** — Backend (Django / DRF)
* **Upcoders Team**

---

## 📜 License

Private proprietary software — © Upcoders.
Not intended for public distribution.
