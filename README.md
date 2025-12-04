# Kaizen Proof of Concept - Backend

## This project is a Django-based backend API.

### Prerequisites

Python 3.10 or higher
Git
Local Setup Instructions

Follow these steps to get the server running on your local machine.

## 1. Clone the Repository
```
git clone https://github.com/upcoders-cloud/kaizen-app.git
cd ./backend
```

## 2. Create and Activate Virtual Environment
It is recommended to use a virtual environment to manage dependencies.

Windows:
```
python -m venv venv
.\venv\Scripts\activate
```

macOS/Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

## 3. Install Dependencies
```bash
pip install -r requirements.txt
cd ./backend 
pip install -e .
```

## 4. Environment Variables

This project uses python-dotenv. You need to create a .env file in the backend folder to store your secret keys.

## 5. Database Setup

Since the database is not included in the repository (for security reasons), you must initialize it locally.

# Create the database tables
```bash
python manage.py migrate
```

# (Optional) Create an admin user to access the Django Admin panel
```bash
python manage.py createsuperuser
```

## 6. Run the Server
```bash
python manage.py runserver
```

The server will start at http://127.0.0.1:8000/.

### API Documentation
Admin Panel: http://127.0.0.1:8000/admin/
Swagger/API Docs: http://127.0.0.1:8000/api/docs/ (or your configured schema URL)

### Troubleshooting
"No such table" error: This means you forgot to run python manage.py migrate.
"OperationalError": Check if your virtual environment is activated.

