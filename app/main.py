from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from .model import FEATURES, MobilePriceService


BASE_DIR = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = BASE_DIR / "artifacts"


app = FastAPI(title="Mobile Price Classifier")
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


service: MobilePriceService | None = None
service_error: str | None = None


def _ensure_service() -> MobilePriceService | None:
    global service, service_error
    if service is not None:
        return service
    try:
        service = MobilePriceService(ARTIFACTS_DIR)
        service_error = None
        return service
    except Exception as e:
        service = None
        service_error = str(e)
        return None


@app.on_event("startup")
def _startup() -> None:
    global service, service_error
    try:
        service = MobilePriceService(ARTIFACTS_DIR)
        service_error = None
    except Exception as e:
        service = None
        service_error = str(e)


@app.get("/", response_class=HTMLResponse)
def index(request: Request) -> Any:
    return FileResponse(str(BASE_DIR / "templates" / "index.html"))


@app.get("/api/schema")
def schema() -> Dict[str, Any]:
    if _ensure_service() is None:
        raise HTTPException(status_code=500, detail=service_error or "Model servisi başlatılamadı.")
    return {"features": service.schema()}  # type: ignore[union-attr]


@app.get("/api/health")
def health() -> Dict[str, Any]:
    _ensure_service()
    return {"ok": service is not None, "error": service_error}


@app.post("/api/predict")
async def predict(request: Request) -> Dict[str, Any]:
    if _ensure_service() is None:
        raise HTTPException(status_code=500, detail=service_error or "Model servisi başlatılamadı.")

    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Geçersiz JSON gövdesi.")

    missing = [f for f in FEATURES if f not in payload]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Eksik özellikler: {', '.join(missing)}",
        )

    try:
        features = {k: float(payload[k]) for k in FEATURES}
    except Exception:
        raise HTTPException(status_code=400, detail="Özellikler sayısal olmalı.")

    result = service.predict_from_features(features)  # type: ignore[union-attr]
    return {
        "predicted_class": result.predicted_class,
        "probabilities": result.probabilities,
    }

