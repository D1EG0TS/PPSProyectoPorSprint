#!/bin/bash

# Crear entorno virtual
echo "Creando entorno virtual..."
python -m venv venv

# Activar entorno e instalar dependencias
echo "Activando entorno e instalando dependencias..."
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

pip install --upgrade pip
pip install -r requirements.txt

# Crear .env si no existe
if [ ! -f .env ]; then
    echo "Creando archivo .env desde .env.example..."
    cp .env.example .env
fi

echo "Configuración finalizada. Ejecuta 'uvicorn main:app --reload' para iniciar."
