from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request

from app.config import settings
from app.database import Base, engine
import app.models  # noqa: F401
from app.routers import auth, dream, event, feedback, fortune, home, membership, mood
from app.routers import order, summary, user

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
FRONTEND_DIST_DIR = FRONTEND_DIR / "dist"
ENGLISH_FRONTEND_DIR = BASE_DIR / "frontend-english"
ENGLISH_FRONTEND_DIST_DIR = ENGLISH_FRONTEND_DIR / "dist"

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AI Dream MVP API",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(dream.router)
app.include_router(mood.router)
app.include_router(summary.router)
app.include_router(fortune.router)
app.include_router(home.router)
app.include_router(membership.router)
app.include_router(order.router)
app.include_router(feedback.router)
app.include_router(event.router)

if (FRONTEND_DIST_DIR / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST_DIR / "assets"),
        name="frontend-assets",
    )

if (ENGLISH_FRONTEND_DIST_DIR / "assets").exists():
    app.mount(
        "/en-assets",
        StaticFiles(directory=ENGLISH_FRONTEND_DIST_DIR / "assets"),
        name="frontend-english-assets",
    )


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"code": 5000, "message": str(exc), "data": {}},
    )


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def _chinese_frontend_response():
    dist_index = FRONTEND_DIST_DIR / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)

    return HTMLResponse(
        """
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px;">
            <h2>React front-end not built yet.</h2>
            <p>Run <code>npm run dev</code> for local development, or <code>npm run build</code> to generate <code>frontend/dist</code>.</p>
          </body>
        </html>
        """
    )


@app.get("/")
def frontend_index():
    return _chinese_frontend_response()


def _english_frontend_response():
    dist_index = ENGLISH_FRONTEND_DIST_DIR / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)

    return HTMLResponse(
        """
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px;">
            <h2>English front-end not built yet.</h2>
            <p>Run <code>cd frontend-english && npm run build</code> to generate <code>frontend-english/dist</code>.</p>
          </body>
        </html>
        """
    )


@app.get("/en")
@app.get("/en/")
def english_frontend_index():
    return _english_frontend_response()


@app.get("/en/{full_path:path}")
def english_frontend_fallback(full_path: str):
    if not full_path or full_path == "/":
        return _english_frontend_response()
    return _english_frontend_response()


def _is_reserved_non_spa_path(full_path: str) -> bool:
    """Paths that must not be served as the Chinese SPA shell."""
    if not full_path:
        return True
    segment = full_path.split("/", 1)[0]
    return segment in {
        "api",
        "docs",
        "redoc",
        "openapi.json",
        "openapi.yaml",
        "assets",
        "en-assets",
        "en",
        "health",
    }


@app.get("/{full_path:path}")
def chinese_frontend_fallback(full_path: str):
    if _is_reserved_non_spa_path(full_path):
        raise HTTPException(status_code=404)
    return _chinese_frontend_response()
