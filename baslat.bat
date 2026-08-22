@echo off
echo ==========================================
echo DHL Waybill Uygulamasi Baslatiliyor...
echo ==========================================

cd /d "%~dp0"

:: 1. Arka yuz (Django) kurulumu ve baslatilmasi
echo [1/4] Python Sanal Ortami kontrol ediliyor...
if not exist "dhl_waybill_project\venv" (
    echo Sanal ortam bulunamadi, olusturuluyor...
    python -m venv dhl_waybill_project\venv
)

echo [2/4] Python gereksinimleri yukleniyor...
call dhl_waybill_project\venv\Scripts\activate.bat
pip install -r dhl_waybill_project\requirements.txt

echo [3/4] Node.js modulleri kontrol ediliyor...
cd dhl-waybill-frontend
if not exist "node_modules" (
    echo Node modulleri eksik, yukleniyor (bu biraz surebilir)...
    call npm install
)
cd ..

echo [4/4] Sunucular baslatiliyor...

:: Arka yuzu yeni bir terminalde baslat
start "DHL Arka Yuz (Django)" cmd /c "cd dhl_waybill_project && call venv\Scripts\activate.bat && python manage.py runserver"

:: On yuzu yeni bir terminalde baslat
start "DHL On Yuz (React)" cmd /c "cd dhl-waybill-frontend && npm run dev"

echo ==========================================
echo Islem tamamlandi!
echo Tarayicinizda localhost adresi acilacaktir.
echo Iki adet terminal penceresi acildi, bunlari kapatirsaniz uygulama kapanir.
echo ==========================================
pause
