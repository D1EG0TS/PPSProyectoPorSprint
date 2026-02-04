#!/bin/bash

# Instalar dependencias
echo "Instalando dependencias..."
npm install --legacy-peer-deps

# Crear .env si no existe
if [ ! -f .env ]; then
    echo "Creando archivo .env desde .env.example..."
    cp .env.example .env
fi

echo "Configuración finalizada. Ejecuta 'npx expo start' para iniciar."
