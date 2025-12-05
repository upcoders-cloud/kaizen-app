#Kaizen Proof of Concept - Backend

## This project is a Django-based backend API, fully containerized with Docker for easy development and deployment.

### Prerequisites

- Docker Desktop (ensure it is running)
- Git

## Quick Start (Docker)

### Follow these steps to get the server running instantly.

## 1. Clone the Repository
git clone https://github.com/upcoders-cloud/kaizen-app.git
cd kaizenProofOfConcept


## 2. Configure Environment Variables
Create a .env file in the backend folder.
Open backend/.env and ensure the values are correct.

## 3. Run the Application

This command builds the image, installs dependencies, runs migrations, and starts the server.

docker-compose up --build

Wait until you see: Starting development server at http://0.0.0.0:8000/

Access the site: http://localhost:8000/

First-Time Setup (Superuser)

Since the database runs inside the container, you execute commands using docker exec. Run this in a new terminal window while the container is running:

```bash
docker exec -it kaizen_backend python manage.py createsuperuser
```

Admin Panel: http://localhost:8000/admin/

Useful Docker Commands

Goal

Command

Stop Server

Press Ctrl+C in the running terminal

Stop & Remove Containers
```bash
docker-compose down
```
Rebuild (after changing requirements)
```bash
docker-compose up --build
```
Run Migrations Manually
```bash
docker exec -it kaizen_backend python manage.py migrate
```
Open Shell inside Container
```
docker exec -it kaizen_backend /bin/bash
```
Troubleshooting

"Port is already allocated": Stop any other services running on port 8000 (like a local python runserver) and try again.

Database errors: If db.sqlite3 permissions get messed up, delete the file locally and restart Docker to regenerate it.

