#!/bin/bash

# --- CONFIGURACIÓN ---
REPO_DIR="/opt/IA-RESENTIDA"
LOG_FILE="$REPO_DIR/reportes_bot/bitacora.md"
FECHA=$(date "+%Y-%m-%d %H:%M:%S")
ACCION="$1" # El texto que pongas entre comillas al ejecutar

# Validación: Si no dices qué hiciste, el script se para
if [ -z "$ACCION" ]; then
  echo "Error: Debes describir la acción. Ejemplo: ./evento_ia.sh 'Instalar Docker'"
  exit 1
fi

cd $REPO_DIR

# 1. REGISTRO EN BITÁCORA (Diario local)
if [ ! -f "$LOG_FILE" ]; then
    echo "| Fecha | Acción | Estado |" > "$LOG_FILE"
    echo "|---|---|---|" >> "$LOG_FILE"
fi
echo "| $FECHA | **$ACCION** | ✅ Completado |" >> "$LOG_FILE"

# 2. GUARDADO DE SEGURIDAD (Backup Local)
# Primero aseguramos lo que acaba de pasar en el servidor
git add .
# El "|| true" es para que no falle si no hay cambios nuevos, pero siga adelante
git commit -m "Accion IA: $ACCION" || true

# 3. SINCRONIZACIÓN (Nube)
# Bajamos cambios de GitHub con rebase para no romper el historial
git pull origin main --rebase

# 4. SUBIDA FINAL
git push origin main

echo "Accion exitosa: $ACCION"
