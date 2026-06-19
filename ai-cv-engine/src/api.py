# ─────────────────────────────────────────────────────────────
# CredChain — AI CV Engine (Tony)
# FastAPI service that builds PDF CVs. Runs on http://localhost:8001.
# ─────────────────────────────────────────────────────────────

from typing import Any, Dict

from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response

from .cv_render import render_cv_png
from .studio import STUDIO_HTML

app = FastAPI(
    title="CredChain AI CV Engine",
    description="Generates PDF CVs from CredChain student data.",
    version="1.0.0",
)

# Allow cross-origin requests from the backend (5000) and frontend (3000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> Dict[str, Any]:
    return {"service": "ai-cv-engine", "status": "ok", "port": 8001}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "healthy"}


@app.get("/studio", response_class=HTMLResponse)
def studio() -> str:
    """Branded CV Studio page: a form + live preview for the demo."""
    return STUDIO_HTML


@app.post("/generate-cv")
async def generate_cv(
    payload: Dict[str, Any] = Body(
        ...,
        examples=[
            {
                "name": "Ada Lovelace",
                "skills": ["Python", "Math"],
                "summary": "Test run",
            }
        ],
    )
) -> Dict[str, Any]:
    """
    Accept an arbitrary JSON dictionary payload and return a JSON
    receipt verifying the data was delivered to the CV engine.
    """
    return {
        "success": True,
        "service": "ai-cv-engine",
        "message": "CV generation request received successfully.",
        "received_keys": list(payload.keys()),
        "received_payload": payload,
    }


@app.post(
    "/generate-cv/image",
    responses={200: {"content": {"image/png": {}}}},
)
async def generate_cv_image(
    payload: Dict[str, Any] = Body(
        ...,
        examples=[
            {
                "name": "Ada Lovelace",
                "title": "Mathematician & Programmer",
                "summary": "Pioneer of computing; wrote the first algorithm "
                "intended for a machine.",
                "email": "ada@credchain.io",
                "phone": "+44 20 1234 5678",
                "location": "London, UK",
                "skills": ["Python", "Mathematics", "Algorithms", "Analysis"],
                "achievements": [
                    "Authored the first published computer algorithm.",
                    "Translated and expanded Menabrea's Analytical Engine notes.",
                    "Foresaw computers handling more than pure calculation.",
                ],
            }
        ],
    )
) -> Response:
    """
    Accept CV data as JSON and return a designed PNG image of the CV.

    Same flexible input as /generate-cv; unknown keys are ignored.
    Returns image/png bytes you can view, download, or embed.
    """
    png_bytes = render_cv_png(payload)
    return Response(content=png_bytes, media_type="image/png")
