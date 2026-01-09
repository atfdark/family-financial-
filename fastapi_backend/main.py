import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from config import settings
from utils.database import initialize_database
from database import init_supabase_clients
import asyncio
from routers.expenses import router as expenses_router
from routers.dashboard import router as dashboard_router
from routers.categories import router as categories_router
from routers.payment_methods import router as payment_methods_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    import inspect

    logger.info("Starting FastAPI application")

    # Initialize database (async-aware): if initialize_database is async, await it;
    # otherwise run it in a thread to avoid blocking the event loop.
    try:
        if inspect.iscoroutinefunction(initialize_database):
            await initialize_database()
        else:
            await asyncio.to_thread(initialize_database)
        logger.info("Database initialized")
    except Exception:
        logger.exception("Database initialization failed")
        raise

    # Initialize Supabase clients in a thread if necessary, but assign to app.state
    # on the main thread to avoid mutating app from a worker thread.
    try:
        if inspect.iscoroutinefunction(init_supabase_clients):
            user_client, admin_client = await init_supabase_clients()
        else:
            user_client, admin_client = await asyncio.to_thread(init_supabase_clients)
        app.state.supabase_user_client = user_client
        app.state.supabase_admin_client = admin_client
        logger.info("Supabase clients initialized")
    except Exception:
        logger.exception("Supabase client initialization failed")
        raise

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

@app.get("/styles.css")
async def styles():
    return FileResponse("../public/styles.css")

@app.get("/dashboard.js")
async def dashboard_js():
    return FileResponse("../public/dashboard.js")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)