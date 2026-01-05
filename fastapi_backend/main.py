import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from config import settings
from utils.database import initialize_database
from routers.auth import router as auth_router
from routers.expenses import router as expenses_router
from routers.dashboard import router as dashboard_router
from routers.categories import router as categories_router
from routers.payment_methods import router as payment_methods_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting FastAPI application")
    initialize_database()
    logger.info("Database initialized")
    yield
    # Shutdown
    logger.info("Shutting down FastAPI application")
    pass

app = FastAPI(
    title="Family Financial API",
    description="Unified FastAPI backend for family financial management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["Authentication"]
)

app.include_router(
    expenses_router,
    prefix="/api/expenses",
    tags=["Expenses"]
)

app.include_router(
    dashboard_router,
    prefix="/api/dashboard",
    tags=["Dashboard"]
)

app.include_router(
    categories_router,
    prefix="/api/categories",
    tags=["Categories"]
)

app.include_router(
    payment_methods_router,
    prefix="/api/payment-methods",
    tags=["Payment Methods"]
)

@app.get("/")
async def root():
    return FileResponse("../public/index.html")

@app.get("/register")
async def register_page():
    return FileResponse("../public/register.html")

@app.get("/styles.css")
async def styles():
    return FileResponse("../public/styles.css")

@app.get("/dashboard.js")
async def dashboard_js():
    return FileResponse("../public/dashboard.js")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)