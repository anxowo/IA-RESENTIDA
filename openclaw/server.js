const express = require("express");
const axios = require("axios");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;

app.use(express.json());

/* =========================
   EJECUTAR COMANDOS
========================= */
function run(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        return resolve(stderr || error.message);
      }
      resolve(stdout || stderr);
    });
  });
}

/* =========================
   SEGURIDAD
========================= */

const allowedServices = ["ssh", "nginx", "apache2"];

const allowedCommands = [
  "uptime",
  "df -h",
  "free -m",
  "whoami"
];

function isAllowedCommand(cmd) {
  return allowedCommands.includes(cmd);
}

/* =========================
   OLLAMA (phi3)
========================= */

async function askOllama(message, systemInfo = "") {
  const prompt = `
Eres un asistente de sistema Linux.

Responde SOLO en JSON con uno de estos formatos:

1. Chat:
{
  "action": "chat",
  "response": "texto"
}

2. Reiniciar servicio:
{
  "action": "restart_service",
  "service": "ssh"
}

3. Ejecutar comando permitido:
{
  "action": "run_command",
  "command": "uptime"
}

REGLAS:
- SOLO JSON
- NO comandos peligrosos
- NO rm, dd, mkfs, etc
- Si no es acción → chat

Sistema:
${systemInfo}

Usuario: ${message}
`;

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi3",
      prompt,
      stream: false
    });

    return JSON.parse(response.data.response);
  } catch (e) {
    return {
      action: "chat",
      response: "Error al procesar la respuesta del modelo"
    };
  }
}

/* =========================
   ENDPOINT
========================= */

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Mensaje vacío"
      });
    }

    // contexto del sistema
    const systemInfo = await run("uptime && free -m && df -h");

    const ai = await askOllama(message, systemInfo);

    /* =========================
       ACCIONES
    ========================= */

    if (ai.action === "restart_service") {
      if (!allowedServices.includes(ai.service)) {
        return res.json({
          role: "assistant",
          content: `Servicio no permitido: ${ai.service}`
        });
      }

      const result = await run(`systemctl restart ${ai.service}`);

      return res.json({
        role: "assistant",
        content: `Servicio ${ai.service} reiniciado.\n${result}`
      });
    }

    if (ai.action === "run_command") {
      if (!isAllowedCommand(ai.command)) {
        return res.json({
          role: "assistant",
          content: "Comando no permitido"
        });
      }

      const result = await run(ai.command);

      return res.json({
        role: "assistant",
        content: result
      });
    }

    /* =========================
       CHAT NORMAL
    ========================= */

    return res.json({
      role: "assistant",
      content: ai.response
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
  console.log(`🚀 IA corriendo en http://localhost:${PORT}`);
});
