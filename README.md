# AURA - Autonomous Unified Record Assistant

A smart AI-powered healthcare platform that connects patients, doctors, and hospitals through one unified system. AURA uses advanced AI agents to provide intelligent consultations, automate medical record management, and predict healthcare surges.

## 🏗️ Architecture

This is a monorepo with two main services:

- **Frontend** (`/frontend`): Next.js 16 app with React 19, Tailwind CSS v4, TypeScript
- **Backend** (`/backend`): FastAPI app with PostgreSQL, SQLAlchemy (async), and multi-agent AI system powered by LangGraph

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.11+
- **PostgreSQL** 14+
- **Conda** (for Python environment management)
- **OpenAI API Key** (for AI features)

### Initial Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd aura_health
```

2. **Install all dependencies:**
```bash
npm run install:all
```

This will:
- Install frontend dependencies (`npm install` in `/frontend`)
- Install backend dependencies (`pip install -r requirements.txt` in `/backend`)

**Note:** If you don't have conda set up, you can manually install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. **Set up the database:**
```bash
# Create PostgreSQL database
createdb aura_health

# Or using psql
psql -U postgres -c "CREATE DATABASE aura_health;"
```

4. **Configure environment variables:**

**Backend** (`/backend/.env`):
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/aura_health

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# JWT Secret
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
CORS_ORIGINS=http://localhost:3000
```

**Frontend** (`/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

5. **Run database migrations:**
```bash
cd backend
alembic upgrade head
```

### Running the Application

**Start the backend:**
```bash
npm run backend
# Or manually:
cd backend
conda run -n aura python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Backend runs on http://localhost:8000
```

**Start the frontend:**
```bash
npm run dev
# Or manually:
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API Docs: http://localhost:8000/docs
- Backend Health Check: http://localhost:8000/health

## 🧠 AI Agent System

AURA uses multiple specialized AI agents built with LangGraph and OpenAI GPT-4o:

### PatientAgent (LangGraph)
- **Conversational AI**: Engages in natural conversations to understand patient symptoms
- **Risk Assessment**: Evaluates symptom severity and provides medical guidance
- **Appointment Scheduling**: Intelligently schedules appointments with available doctors
- **Autonomous Escalation**: Escalates serious cases to human doctors automatically
- **Document Analysis**: Analyzes uploaded medical documents using GPT-4o Vision

### DoctorAgent
- **Consultation Summaries**: Generates comprehensive AI summaries of patient consultations
- **Medical Insights**: Provides structured analysis with key points and suggestions
- **Prescription Management**: Assists with prescription creation and verification

### SurgeAgent
- **Surge Prediction**: Predicts patient surges based on external factors (festivals, pollution, weather)
- **Resource Planning**: Helps hospitals prepare for increased demand

### AdminAgent
- **Hospital Operations**: Answers queries about hospital operations and analytics
- **Data Insights**: Provides AI-powered recommendations for resource management

## 🔑 Key Features

### Patient Features
- **AI Chat Consultation**: Chat with AURA to discuss symptoms and get medical guidance
- **Document Upload**: Upload medical documents (images) for AI analysis
- **Appointment Scheduling**: Schedule appointments with doctors through AI assistance
- **Health Data Tracking**: View consultation history and medical records
- **Prescription Viewing**: Receive and view prescriptions from doctors

### Doctor Features
- **Patient Queue**: View assigned consultations in real-time
- **AI-Powered Summaries**: Generate comprehensive consultation summaries
- **Chat with Patients**: Send messages and prescriptions to patients
- **Consultation Management**: Review patient history, documents, and previous consultations
- **Appointment Calendar**: View and manage scheduled appointments

### Hospital Admin Features
- **Analytics Dashboard**: Monitor consultations, patient trends, and hospital metrics
- **Surge Prediction**: View AI-powered surge predictions based on external factors
- **Resource Management**: Get recommendations for staff and resource allocation
- **Data Sources**: Manage external data sources for surge prediction

## 📁 Project Structure

```
/aura_health
  /frontend
    /src
      /app              # Next.js app router pages
        /(patient)      # Patient routes
        /(doctor)      # Doctor routes
        /(hospital)    # Hospital admin routes
      /components       # React components
        /ui            # Reusable UI components
        /upload         # File upload components
        /chat          # Chat components
      /lib             # Utilities, API client, auth
    /public            # Static assets
    package.json
    next.config.ts
    tsconfig.json

  /backend
    /app
      /api/v1          # FastAPI route handlers
        /ai.py         # AI agent endpoints
        /consultations.py
        /messages.py
        /documents.py
        /appointments.py
        ...
      /core            # Core configuration
        /config.py     # Settings
        /database.py   # Database connection
        /security.py   # JWT auth
        /dependencies.py
      /models          # SQLAlchemy ORM models
      /schemas         # Pydantic request/response schemas
      /services        # Business logic
        /ai_agents_langgraph.py  # LangGraph agents
        /ai_agents.py            # Legacy agents
    /alembic           # Database migrations
    main.py            # FastAPI app entry point
    requirements.txt
    Dockerfile
```

## 🔐 Authentication

JWT-based authentication with role-based access control:
- **Patient**: Access to personal dashboard, chat, documents, appointments
- **Doctor**: Access to patient queue, consultations, ability to send prescriptions
- **Hospital Admin**: Access to analytics, surge predictions, resource management

Authentication is handled via `X-User-ID` header in API requests (simplified for development).

## 📡 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

- `POST /api/v1/ai/chat` - Patient chat with AI agent
- `POST /api/v1/ai/summary` - Generate consultation summary
- `GET /api/v1/consultations` - List consultations
- `POST /api/v1/messages` - Send messages
- `POST /api/v1/messages/prescription` - Send prescription
- `POST /api/v1/documents/upload` - Upload medical documents
- `GET /api/v1/appointments` - List appointments

## 🛠️ Development

### Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Axios for API calls
- React Markdown for message rendering

**Backend:**
- FastAPI 0.115
- SQLAlchemy 2.0 (async)
- PostgreSQL with asyncpg
- OpenAI API (GPT-4o, GPT-4o Vision)
- LangChain & LangGraph for agent orchestration
- Alembic for migrations
- Pydantic for validation

### Database Migrations

```bash
cd backend

# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Style

- **Frontend**: ESLint with Next.js config
- **Backend**: Follow PEP 8, use type hints

## 🐳 Docker

Each service has its own Dockerfile for containerized deployment:

**Backend:**
```bash
cd backend
docker build -t aura-backend .
docker run -p 8000:8000 --env-file .env aura-backend
```

**Frontend:**
```bash
cd frontend
docker build -t aura-frontend .
docker run -p 3000:3000 --env-file .env.local aura-frontend
```

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/aura_health
OPENAI_API_KEY=sk-...
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🧪 Testing

```bash
# Backend tests (when implemented)
cd backend
pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

## 📚 Additional Documentation

- [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md) - Detailed architecture and development notes
- [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) - Setup completion checklist

## 🤝 Contributing

This is a hackathon project. For contributions:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Private - Hackathon Project

## 🙏 Acknowledgments

Built with:
- OpenAI GPT-4o for AI capabilities
- LangGraph for agent orchestration
- Next.js and FastAPI for the tech stack
