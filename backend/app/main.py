from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import upload, preview, profile, cleaning, dashboard, chat, export

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Automated Data Analysis, Custom Dashboard Generator, and AI Chatbot API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(upload.router, prefix="/api", tags=["Upload & Sample Data"])
app.include_router(preview.router, prefix="/api/datasets", tags=["Dataset Preview"])
app.include_router(profile.router, prefix="/api/datasets", tags=["Profiling & EDA"])
app.include_router(cleaning.router, prefix="/api/datasets", tags=["Data Cleaning"])
app.include_router(dashboard.router, prefix="/api/datasets", tags=["Dashboard Generation & Customization"])
app.include_router(chat.router, prefix="/api/datasets", tags=["AI Data Chatbot"])
app.include_router(export.router, prefix="/api/datasets", tags=["Exports"])

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "model": settings.GEMINI_MODEL
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
