// server.js - OpenClaw + Ollama + WARP
console.log("🔴 [1/7] Iniciando OpenClaw...");

require('dotenv').config();
console.log("✅ [2/7] dotenv cargado");

const express = require("express");
const { exec } = require("child_process");
console.log("✅ [3/7] dependencias cargadas");

const app = express();
app.use(express.json());

// 🔐 Configuración
const AUTH_TOKEN = process.env.AUTH_TOKEN || "12345";
const ALLOWED_COMMANDS = (process.env.ALLOWED_COMMANDS || "ls -la|uptime|df -h").split('|');
const PORT = process.env.PORT || 3000;

console.log("✅ [4/7] configuración cargada");

// 🧠 Prompt del sistema para la IA
const SYSTEM_PROMPT = `
ROL: Eres un traductor de lenguaje natural a comandos Linux. NO eres un asistente conversacional.

TU ÚNICA SALIDA VÁLIDA es UNO de estos comandos EXACTOS:
${ALLOWED_COMMANDS.map(c => `- "${c}"`).join('\n')}

REGLAS ABSOLUTAS:
1. Si el usuario pide algo que se puede hacer con uno de los comandos de arriba → devuelve SOLO ese comando, sin comillas, sin explicación.
2. Si el usuario pide algo que NO está en la lista → devuelve EXACTAMENTE: "❌ Comando no permitido"
3. NUNCA expliques, NUNCA des consejos, NUNCA hables como asistente.
4. NUNCA inventes comandos. NUNCA uses palabras fuera de la lista permitida.
5. Responde en 1-10 palabras máximo.

EJEMPLOS DE ENTRADA/SALIDA:
Usuario: "reinicia apache" → Tú: systemctl restart apache2
Usuario: "cómo está el ssh" → Tú: systemctl status ssh
Usuario: "lista los archivos" → Tú: ls -la
Usuario: "cuánto espacio hay" → Tú: df -h
Usuario: "borra todo" → Tú: ❌ Comando no permitido
Usuario: "hola, ¿qué puedes hacer?" → Tú: ❓ No entendí
Usuario: "actualiza paquetes" → Tú: apt update

IMPORTANTE: Tu respuesta debe ser EXACTAMENTE el comando o el mensaje de error. Nada más.
`;

// 🤖 Función para consultar a Ollama (local, gratis)
async function consultarIA(mensajeUsuario) {
  try {
    console.log(`🔄 Consultando Ollama con: "${mensajeUsuario.substring(0,50)}..."`);
    
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3:mini',
        prompt: SYSTEM_PROMPT + "\n\nUsuario: " + mensajeUsuario,
        stream: false,
        options: { temperature: 0.1, num_predict: 100 }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const resultado = data.response.trim();
    console.log(`🤖 Ollama respondió: "${resultado}"`);
    return resultado;
  } catch (error) {
    console.error("❌ Error con Ollama:", error.message);
    return "⚠️ Error: IA local no responde. Verifica: ollama serve";
  }
}

// ✅ Ejecutar comando con whitelist
function ejecutarComando(comando, callback) {
  const comandoLimpio = comando.trim();
  
  if (!ALLOWED_COMMANDS.includes(comandoLimpio)) {
    console.log(`🚫 Comando rechazado: "${comandoLimpio}"`);
    return callback("❌ Comando no permitido por seguridad");
  }

  console.log(`🔧 Ejecutando: ${comandoLimpio}`);
  
  exec(comandoLimpio, { shell: "/bin/bash", timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      callback(`❌ Error: ${stderr || error.message}`);
    } else {
      callback(stdout || "✅ Comando ejecutado sin salida");
    }
  });
}

// 🌐 Endpoint: Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "✅ OpenClaw activo", 
    timestamp: new Date().toISOString(),
    comandos_permitidos: ALLOWED_COMMANDS.length
  });
});

// 🌐 Endpoint principal: /mensaje
app.post("/mensaje", async (req, res) => {
  console.log(`📨 [${new Date().toISOString()}] Nueva petición`);
  
  // Autenticación
  const token = req.headers['x-auth-token'];
  if (token !== AUTH_TOKEN) {
    console.log("🔒 Acceso denegado: token inválido");
    return res.status(401).json({ error: "🔒 No autorizado" });
  }

  const mensajeUsuario = req.body.mensaje;
  if (!mensajeUsuario) {
    return res.status(400).json({ error: "Falta el campo 'mensaje'" });
  }
  
  console.log(`💬 Usuario: "${mensajeUsuario}"`);

  try {
    // 1️⃣ IA interpreta lenguaje natural
    const comando = await consultarIA(mensajeUsuario);

    // 2️⃣ Si es respuesta de error, devolverla
    if (comando.startsWith("❌") || comando.startsWith("❓") || comando.startsWith("⚠️")) {
      return res.json({ respuesta: comando });
    }

    // 3️⃣ Ejecutar comando validado
    ejecutarComando(comando, (resultado) => {
      res.json({ 
        comando_ejecutado: comando,
        respuesta: resultado 
      });
    });

  } catch (error) {
    console.error("❌ Error interno:", error);
    res.status(500).json({ error: "⚠️ Error interno del servidor" });
  }
});

// 🚀 Iniciar servidor
console.log("✅ [5/7] endpoints configurados");
console.log("✅ [6/7] listo para escuchar");

app.listen(PORT, '127.0.0.1', () => {
  console.log("✅ [7/7] ¡TODO LISTO!");
  console.log(`🚀 OpenClaw ACTIVO en http://127.0.0.1:${PORT}`);
  console.log(`🤖 IA: Ollama (phi3:mini)`);
  console.log(`🔐 Token: ${AUTH_TOKEN}`);
  console.log(`📋 Comandos permitidos: ${ALLOWED_COMMANDS.length}`);
  console.log("👉 Esperando peticiones POST /mensaje...");
});
