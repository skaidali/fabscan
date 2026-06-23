
@echo off
setlocal

cd /d "%~dp0"

python -m pip install -r "%~dp0server\requirements.txt"
start "" /B python "%~dp0server\serveur.py"
start "" /B python "%~dp0acquisition\data_treatment.py"

timeout /t 2 /nobreak >nul
start "" "http://localhost:8000"

endlocal