#!/bin/bash

# Tu API Key (reemplaza con la real)
API_KEY="AIzaSyDSYkd1kiPQWJFv5Fi_nfTCA5tPmGelypk"

# Probar con endpoint v1 (en lugar de v1beta)
echo "🔄 Probando con endpoint v1..."
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{ "text": "Responde solo con: OK" }]
    }]
  }'

echo -e "\n\n🔄 Si falla, probando con v1beta y modelo alternativo..."
# Fallback con v1beta y gemini-1.5-flash-8b
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{ "text": "Responde solo con: OK" }]
    }]
  }'
