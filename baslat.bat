@echo off
setlocal
title DHL Konsimento Yonetimi
cd /d "%~dp0"

echo ==========================================
echo DHL Waybill Uygulamasi Baslatiliyor...
echo ==========================================

:: 1. Python sanal ortami
if not exist "dhl_waybill_project\venv" (
    echo [1/5] Sanal ortam olusturuluyor...
    python -m venv dhl_waybill_project\venv
) else (
    echo [1/5] Sanal ortam mevcut.
)

call dhl_waybill_project\venv\Scripts\activate.bat

echo [2/5] Python gereksinimleri kontrol ediliyor...
pip install -r dhl_waybill_project\requirements.txt --quiet

:: 2. .env yoksa ornekten olustur (ilk calistirmada kullaniciya sormadan calissin diye)
if not exist "dhl_waybill_project\.env" (
    echo [3/5] .env dosyasi olusturuluyor...
    copy /y "dhl_waybill_project\.env.example" "dhl_waybill_project\.env" >nul
)

:: 3. Frontend'i SADECE bir kez, gerekiyorsa derle (dist klasoru yoksa)
if not exist "dhl-waybill-frontend\dist" (
    echo [4/5] Arayuz ilk kez derleniyor, bu biraz surebilir...
    pushd dhl-waybill-frontend
    if not exist "node_modules" (
        call npm install
    )
    call npm run build
    popd
) else (
    echo [4/5] Arayuz zaten derlenmis.
)

:: 4. Tek pencerede: sunucuyu baslat + tarayiciyi otomatik ac
echo [5/5] Uygulama baslatiliyor, tarayici birazdan acilacak...
echo (Bu pencereyi kapatirsaniz uygulama durur.)
echo ==========================================

cd dhl_waybill_project
python run.py

pause
