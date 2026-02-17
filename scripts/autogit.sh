#!/bin/bash

# --- CONFIGURACIÓN ---
REPO_DIR="/opt/IA-RESENTIDA"
ARCHIVO_LOGS="/var/log/git_bot.log"
FECHA=$(date "+%Y-%m-%d %H:%M:%S")

cd $REPO_DIR || { echo "No encuentro el directorio"; exit 1; }

# 1. BAJAR CAMBIOS
echo "[$FECHA] Sincronizando con GitHub..." >> $ARCHIVO_LOGS
git pull origin main --no-edit >> $ARCHIVO_LOGS 2>&1

# 2. AÑADIR LO NUEVO
git add .

# 3. VERIFICAR SI HAY CAMBIOS REALES
if git diff-index --quiet HEAD --; then
    echo "[$FECHA] Nada nuevo que subir." >> $ARCHIVO_LOGS
else
    # 4. GUARDAR Y SUBIR
    COMMIT_MSG="Auto-Update: Avances del Bot - $FECHA"
    
    git commit -m "$COMMIT_MSG" >> $ARCHIVO_LOGS 2>&1
    git push origin main >> $ARCHIVO_LOGS 2>&1
    
    echo "[$FECHA] ¡Éxito! Cambios subidos: $COMMIT_MSG" >> $ARCHIVO_LOGS
fi
