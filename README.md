# Mobile Price Classification Web App (FastAPI)

Bu proje, PyTorch ile eğitilmiş mobil cihaz fiyat aralığı sınıflandırma modelini (`mobile_model.pth`) ve eğitimde kullanılan scaler'ı (`scaler.pkl`) FastAPI üzerinden servis eder.

## Klasör yapısı

- `app/`: API ve model kodu
- `artifacts/`: `mobile_model.pth` ve `scaler.pkl` buraya konmalı
- `templates/`: HTML şablonları
- `static/`: CSS/JS

## Kurulum

```bash
cd mobile-price-webapp
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Model dosyalarını ekleme

`mobile_model.pth` ve `scaler.pkl` dosyalarını şu klasöre kopyalayın:

- `artifacts/mobile_model.pth`
- `artifacts/scaler.pkl`

## Çalıştırma

```bash
uvicorn app.main:app --reload
```

Arayüz:
- `http://127.0.0.1:8000`

API:
- `POST http://127.0.0.1:8000/api/predict`

