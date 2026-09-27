# Kaizen App

Kaizen App is an improvement-idea platform built by **UPCODERS**. This repository contains the backend API and mobile and web clients.

---

## 📦 Repository Structure

```
/backend        # Django REST API
/frontend       # Frontend projects
  /mobile       # React Native (Expo) mobile app
  /web          # Next.js desktop panel
```

---

## 🚀 Getting Started

Choose the part of the system you want to run and follow the dedicated README:

- **Backend (Django + Docker)** → `backend/README.md`
- **Mobile app (Expo/React Native)** → `frontend/mobile/README.md`
- **Web panel (Next.js)** → `frontend/web/README.md` (`npm install`, `.env.local`, `npm run dev`)

The web client needs the backend API URL in `frontend/web/.env.local` as `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`. See its README for the full setup.

---

## 🧩 Tech Overview

- **Backend:** Django + Django REST Framework, Docker
- **Mobile:** React Native (Expo), Zustand, MMKV, Axios
- **Web:** Next.js 16, React 19, TypeScript, Tailwind CSS, TanStack React Query

## 👥 Roles

`EMPLOYEE` can submit and follow ideas. `TEAM_LEAD` can also review ideas and see their team. `MANAGER` and `DIRECTOR` additionally access implementation and organization analytics. Staff and superusers have administrator access independently of their role. See the [web panel role matrix](frontend/web/README.md#role-i-sekcje) for the full list of sections.

---

## 📜 License

Private proprietary software - © Upcoders.
Not intended for public distribution.
