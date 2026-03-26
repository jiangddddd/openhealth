from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request

from app.config import settings
from app.database import Base, engine
import app.models  # noqa: F401
from app.routers import auth, dream, feedback, fortune, membership, order, user

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
FRONTEND_DIST_DIR = FRONTEND_DIR / "dist"

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
app.include_router(fortune.router)
app.include_router(membership.router)
app.include_router(order.router)
app.include_router(feedback.router)

if (FRONTEND_DIST_DIR / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST_DIR / "assets"),
        name="frontend-assets",
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


@app.get("/")
def frontend_index():
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
