#!/bin/bash
cd /opt/IA-RESENTIDA

# 1. Bajar novedades silenciosamente
git pull origin main --rebase > /dev/null 2>&1

# 2. Subir cambios pendientes si los hay
git add .
# Si hay cambios, hacemos commit y push
if ! git diff-index --quiet HEAD --; then
    FECHA=$(date "+%Y-%m-%d %H:%M:%S")
    git commit -m "Auto-Update: Rutina $FECHA"
    git push origin main
    echo "[$FECHA] Cambios rutinarios subidos."
fi
