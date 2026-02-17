#!/bin/bash

# --- CONFIGURACIÓN ---
REPO_DIR="/opt/IA-RESENTIDA"
LOG_FILE="$REPO_DIR/reportes_bot/bitacora.md"
FECHA=$(date "+%Y-%m-%d %H:%M:%S")

# El mensaje es lo que tú escribas al llamar al script
MENSAJE_ACCION="$1"

# Si no escribes nada, se queja y sale
if [ -z "$MENSAJE_ACCION" ]; then
  echo "Error: Debes indicar qué acción hiciste. Ej: ./evento_ia.sh 'Reiniciar SSH'"
  exit 1
fi

# 1. ESCRIBIR EN BITÁCORA
echo "| $FECHA | **$MENSAJE_ACCION** | Completado |" >> $LOG_FILE

# 2. SUBIR A GITHUB INMEDIATAMENTE
cd $REPO_DIR

# Nos aseguramos de tener lo último de los compañeros
git pull origin main --rebase > /dev/null 2>&1

git add .

# Mensaje del commit
git commit -m "Accion de IA: $MENSAJE_ACCION"

git push origin main

echo "Acción registrada y subida a GitHub: $MENSAJE_ACCION"
