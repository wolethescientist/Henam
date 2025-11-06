from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os
import time
from app.config import settings
from app.database import engine, Base, get_pool_status
from app.routers import auth, users, teams, jobs, tasks, attendance, reminders, notifications, staff_profiles, financial_dashboard, dashboard, performance, unified_apis, websocket, expenses, expense_categories, financial_analytics, invoices, cache_management
from app.services.reminder_service import reminder_service
from app.services.robust_cache_service import robust_cache
from app.services.notification_queue import notification_queue
from app.middleware.auth_middleware import AuthenticationMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting Henam Task Management Backend...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Start reminder service
    reminder_service.start()
    logger.info("Reminder service started")
    
    # Start notification queue
    print("🚀 MAIN DEBUG: Starting notification queue...")
    await notification_queue.start()
    print(f"🚀 MAIN DEBUG: Notification queue started - is_running: {notification_queue.is_running}")
    print(f"🚀 MAIN DEBUG: Notification queue worker task: {notification_queue.worker_task}")
    logger.info("Notification queue started")
    
    # Display caching system status
    if robust_cache.redis_client:
        logger.info("🚀 Robust caching system: Redis enabled for optimal performance")
        logger.info("📊 Cache observability: Comprehensive monitoring enabled")
    else:
        logger.info("💾 Robust caching system: Redis not available, caching disabled")
        logger.warning("⚠️  Cache observability: Limited monitoring available")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await notification_queue.stop()
    logger.info("Notification queue stopped")
    reminder_service.stop()
    logger.info("Reminder service stopped")


# Create FastAPI app
app = FastAPI(
    title="Henam Task Management Backend",
    description="Backend API for Henam Facility Management Task Management Application",
    version="1.0.0",
    lifespan=lifespan
)

# Add request logging middleware
@app.middleware("https")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing."""
    start_time = time.time()
    
    # Log the incoming request
    logger.info(f"🔄 {request.method} {request.url.path} - Client: {request.client.host if request.client else 'unknown'}")
    
    # Process the request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Log the response
    logger.info(f"✅ {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
    
    return response

origins = [
    "https://henam.onrender.com",  # frontend domain
    "http://localhost:5173",       # for local dev (optional)
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add authentication middleware
app.add_middleware(AuthenticationMiddleware)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(teams.router)
app.include_router(jobs.router)
app.include_router(tasks.router)
app.include_router(attendance.router)
app.include_router(reminders.router)
app.include_router(notifications.router)
app.include_router(staff_profiles.router)
app.include_router(financial_dashboard.router)
app.include_router(dashboard.router)
app.include_router(performance.router)
app.include_router(unified_apis.router)
app.include_router(websocket.router)
app.include_router(expenses.router)
app.include_router(expense_categories.router)
app.include_router(financial_analytics.router)
app.include_router(invoices.router)
app.include_router(cache_management.router)

# Create uploads directory using configured base directory
upload_base_dir = settings.get_upload_base_dir()
os.makedirs(os.path.join(upload_base_dir, "profile_pictures"), exist_ok=True)
os.makedirs(os.path.join(upload_base_dir, "company_logo"), exist_ok=True)

# Mount static files for serving uploaded images
app.mount("/uploads", StaticFiles(directory=upload_base_dir), name="uploads")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Henam Task Management Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "henam-backend"}


@app.get("/health/db")
async def database_health_check():
    """Database health check endpoint with connection pool status."""
    try:
        # Test database connection
        with engine.connect() as connection:
            connection.execute("SELECT 1")
        
        # Get pool status
        pool_status = get_pool_status()
        
        return {
            "status": "healthy",
            "database": "connected",
            "connection_pool": pool_status
        }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Global HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler for unhandled exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "path": str(request.url)
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
