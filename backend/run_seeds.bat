@echo off
echo 🌱 Iniciando Seed de Base de Datos...
call venv\Scripts\activate
python -m app.db.seed_database
pause
