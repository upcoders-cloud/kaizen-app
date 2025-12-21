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

### 1️⃣ Install dependencies

```
npm install
```

### 2️⃣ Start Expo

```
npx expo start
```

This opens the Expo dashboard.

### 3️⃣ Run on mobile device

* Scan the QR code using **Expo Go**
* The app reloads live on save

### 4️⃣ Run in browser

```
npx expo start --web
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
* **Michał** — Backend (Django / DRF)
* **Upcoders Team**

---

## 📜 License

Private proprietary software — © Upcoders.
Not intended for public distribution.
