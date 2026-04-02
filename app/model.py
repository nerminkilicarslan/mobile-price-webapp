from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import pickle
from typing import Any, Dict, List, Literal, Optional, Tuple, TypedDict

import numpy as np
import torch
from torch import nn


FEATURES: List[str] = [
    "battery_power",
    "blue",
    "clock_speed",
    "dual_sim",
    "fc",
    "four_g",
    "int_memory",
    "m_dep",
    "mobile_wt",
    "n_cores",
    "pc",
    "px_height",
    "px_width",
    "ram",
    "sc_h",
    "sc_w",
    "talk_time",
    "three_g",
    "touch_screen",
    "wifi",
]


class MobilePriceClassifier(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.linear_layer_stack = nn.Sequential(
            nn.Linear(20, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 4),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.linear_layer_stack(x)


@dataclass(frozen=True)
class PredictResult:
    predicted_class: int
    probabilities: Dict[int, float]


def _load_scaler(path: Path) -> Any:
    with path.open("rb") as f:
        return pickle.load(f)


def _load_model(path: Path, device: torch.device) -> MobilePriceClassifier:
    model = MobilePriceClassifier()
    state_dict = torch.load(path, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()
    return model


class MobilePriceService:
    def __init__(self, artifacts_dir: Path) -> None:
        self.artifacts_dir = artifacts_dir
        self.device = torch.device("cpu")

        model_path = artifacts_dir / "mobile_model.pth"
        scaler_path = artifacts_dir / "scaler.pkl"
        if not model_path.exists():
            raise FileNotFoundError(f"Model dosyası bulunamadı: {model_path}")
        if not scaler_path.exists():
            raise FileNotFoundError(f"Scaler dosyası bulunamadı: {scaler_path}")

        self.model = _load_model(model_path, self.device)
        self.scaler = _load_scaler(scaler_path)

    def predict_from_features(self, features: Dict[str, float]) -> PredictResult:
        x = np.array([[float(features[name]) for name in FEATURES]], dtype=np.float32)
        x_scaled = self.scaler.transform(x)
        x_tensor = torch.from_numpy(x_scaled.astype(np.float32))

        with torch.no_grad():
            logits = self.model(x_tensor)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            pred = int(np.argmax(probs))

        return PredictResult(
            predicted_class=pred,
            probabilities={i: float(probs[i]) for i in range(len(probs))},
        )

    def schema(self) -> List[Dict[str, Any]]:
        class FieldSchema(TypedDict, total=False):
            name: str
            label: str
            group: str
            input: Literal["number", "checkbox", "select"]
            min: float
            max: float
            step: float
            placeholder: str
            help: str
            options: List[Dict[str, Any]]

        def num(
            name: str,
            label: str,
            group: str,
            *,
            min_v: Optional[float] = None,
            max_v: Optional[float] = None,
            step: float = 1.0,
            placeholder: str = "0",
            help_text: str = "",
        ) -> FieldSchema:
            out: FieldSchema = {
                "name": name,
                "label": label,
                "group": group,
                "input": "number",
                "step": step,
                "placeholder": placeholder,
            }
            if min_v is not None:
                out["min"] = float(min_v)
            if max_v is not None:
                out["max"] = float(max_v)
            if help_text:
                out["help"] = help_text
            return out

        def bin01(name: str, label: str, group: str, *, help_text: str = "") -> FieldSchema:
            out: FieldSchema = {
                "name": name,
                "label": label,
                "group": group,
                "input": "checkbox",
            }
            if help_text:
                out["help"] = help_text
            return out

        items: List[FieldSchema] = [
            # Donanım
            num("battery_power", "Batarya Gücü (mAh)", "Donanım", min_v=0, step=1),
            num("clock_speed", "İşlemci Hızı (GHz)", "Donanım", min_v=0, step=0.1, placeholder="örn. 2.0"),
            num("n_cores", "Çekirdek Sayısı", "Donanım", min_v=1, step=1),
            num("ram", "RAM (MB)", "Donanım", min_v=0, step=1),
            num("int_memory", "Dahili Hafıza (GB)", "Donanım", min_v=0, step=1),
            num("talk_time", "Konuşma Süresi (saat)", "Donanım", min_v=0, step=1),
            # Kamera
            num("fc", "Ön Kamera (MP)", "Kamera", min_v=0, step=1),
            num("pc", "Arka Kamera (MP)", "Kamera", min_v=0, step=1),
            # Ekran
            num("px_height", "Çözünürlük Yükseklik (px)", "Ekran", min_v=0, step=1),
            num("px_width", "Çözünürlük Genişlik (px)", "Ekran", min_v=0, step=1),
            num("sc_h", "Ekran Yüksekliği (cm)", "Ekran", min_v=0, step=0.1),
            num("sc_w", "Ekran Genişliği (cm)", "Ekran", min_v=0, step=0.1),
            bin01("touch_screen", "Dokunmatik Ekran", "Ekran"),
            # Bağlantı
            bin01("wifi", "Wi‑Fi", "Bağlantı"),
            bin01("blue", "Bluetooth", "Bağlantı"),
            bin01("three_g", "3G", "Bağlantı"),
            bin01("four_g", "4G", "Bağlantı"),
            bin01("dual_sim", "Çift SIM", "Bağlantı"),
            # Fiziksel
            num("mobile_wt", "Ağırlık (gr)", "Fiziksel", min_v=0, step=1),
            num("m_dep", "Telefon Kalınlığı (cm)", "Fiziksel", min_v=0, step=0.01, placeholder="örn. 0.6"),
        ]

        return list(items)

