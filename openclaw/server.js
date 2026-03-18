const express = require("express");
const axios = require("axios");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   EJECUTOR
========================= */
function run(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) return resolve(stderr || error.message);
      resolve(stdout || stderr);
    });
  });
}

/* =========================
   SEGURIDAD
========================= */
function isSafeCommand(cmd) {
  const dangerous = ["rm", "shutdown", "reboot", "mkfs", "dd"];
  return !dangerous.some(d => cmd.includes(d));
}

function shouldExecute(message, action) {
  const msg = message.toLowerCase();

  if (action.action === "restart_service") {
    return msg.includes("reinicia") || msg.includes("restart");
  }

  if (action.action === "run_command") {
    return true;
  }

  return false;
}

/* =========================
   OLLAMA (PROMPT BUENO)
========================= */
async function askOllama(message) {
const prompt = `
Eres un asistente inteligente.

Tienes dos modos:

1. CHAT NORMAL:
- Responde de forma natural
- Preguntas generales → NO uses comandos

2. SISTEMA LINUX:
- SOLO si la pregunta requiere el sistema
- entonces añade JSON al FINAL

Formato acciones:

{"action":"run_command","command":"comando"}
{"action":"restart_service","service":"ssh"}

Reglas IMPORTANTES:

- NO uses comandos para preguntas generales
- NO inventes comandos innecesarios
- NO uses curl ni web
- SOLO usa comandos si es algo del sistema (hora, memoria, procesos, servicios)

Ejemplos:

Usuario: que hora es  
→ usar comando date

Usuario: cuantos procesos hay  
→ usar ps

Usuario: a cuantos grados hierve el agua  
→ RESPUESTA NORMAL (sin comandos)

Usuario: ${message}
`;
  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi3:mini",
      prompt,
      stream: false,
      options: {
        num_predict: 100,
        temperature: 0
      },
      timeout: 60000
    });

    let text = response.data.response?.trim();

    if (!text) {
      return { text: "No hay respuesta del modelo" };
    }

    // 🔥 limpiar respuestas tontas del modelo
    if (
      text.includes("no tengo la capacidad") ||
      text.includes("no puedo ejecutar")
    ) {
      text = "Voy a comprobarlo...";
    }

    return { text };

  } catch (e) {
    console.error("ERROR OLLAMA:", e.message);

    return {
      text: "La IA está ocupada, intenta otra vez"
    };
  }
}

/* =========================
   CHAT
========================= */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const ai = await askOllama(message);
    const text = ai.text;

    // 🔍 buscar JSON dentro del texto
    const match = text.match(/\{[\s\S]*?\}/);

    if (match) {
      try {
        const action = JSON.parse(match[0]);
        const cleanText = text.replace(match[0], "").trim();

        // =========================
        // RUN COMMAND
        // =========================
        if (action.action === "run_command") {

          if (!shouldExecute(message, action)) {
            return res.json({
              role: "assistant",
              content: cleanText || "No es necesario ejecutar eso"
            });
          }

          if (!isSafeCommand(action.command)) {
            return res.json({
              role: "assistant",
              content: "⛔ Comando bloqueado por seguridad"
            });
          }

          const result = await run(action.command);

          return res.json({
            role: "assistant",
            content: `${cleanText}\n\n${result}`
          });
        }

        // =========================
        // RESTART SERVICE
        // =========================
        if (action.action === "restart_service") {

          if (!shouldExecute(message, action)) {
            return res.json({
              role: "assistant",
              content: cleanText || "No es necesario reiniciar eso"
            });
          }

          const result = await run(`systemctl restart ${action.service}`);

          return res.json({
            role: "assistant",
            content: `${cleanText}\n\nServicio ${action.service} reiniciado`
          });
        }

      } catch (e) {
        // JSON roto → seguimos normal
      }
    }

    // 💬 respuesta normal
    return res.json({
      role: "assistant",
      content: text
    });

  } catch (error) {
    res.status(500).json({
      error: error.toString()
    });
  }
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 IA funcionando en http://localhost:${PORT}`);
});
