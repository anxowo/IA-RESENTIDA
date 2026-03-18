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
const allowedServices = ["ssh", "sshd", "nginx", "apache2"];

const allowedCommands = [
  "uptime",
  "df -h",
  "free -m",
  "whoami",
  "date",
];

function isAllowedCommand(cmd) {
  return allowedCommands.includes(cmd);
}

/* =========================
   OLLAMA
========================= */
async function askOllama(message) {
  const prompt = `
Eres un asistente inteligente en un sistema Linux.

Reglas:
- Puedes ejecutar comandos del sistema si es útil
- Si necesitas ejecutar algo, responde SOLO con JSON
- Si no, responde normal como chat
- Sé natural, útil y breve

Formato comandos:
{
 "action": "run_command",
 "command": "date"
}

Formato reinicio:
{
 "action": "restart_service",
 "service": "ssh"
}

Usuario: ${message}
`;

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi3",
      prompt,
      stream: false,
      options: {
        num_predict: 150,
        temperature: 0.4,
      },
    });

    let text = response.data.response?.trim();

    if (!text) {
      return { action: "chat", response: "No hay respuesta del modelo" };
    }

    // detectar JSON
    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return { action: "chat", response: text };
      }
    }

    return { action: "chat", response: text };

  } catch (e) {
    console.error("ERROR OLLAMA:", e.message);
    return {
      action: "chat",
      response: "La IA está ocupada, intenta otra vez",
    };
  }
}

/* =========================
   ENDPOINT CHAT
========================= */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const msg = message.toLowerCase();

    /* ===== RESPUESTAS DIRECTAS (rápidas) ===== */
    if (msg.includes("hora")) {
      const result = await run("date");
      return res.json({ role: "assistant", content: result });
    }

    if (msg.includes("memoria")) {
      const result = await run("free -m");
      return res.json({ role: "assistant", content: result });
    }

    if (msg.includes("disco")) {
      const result = await run("df -h");
      return res.json({ role: "assistant", content: result });
    }

    /* ===== IA ===== */
    const ai = await askOllama(message);

    /* ===== ACCIONES ===== */
    if (ai.action === "restart_service") {
      if (!allowedServices.includes(ai.service)) {
        return res.json({
          role: "assistant",
          content: "Servicio no permitido",
        });
      }

      const result = await run(`systemctl restart ${ai.service}`);

      return res.json({
        role: "assistant",
        content: `Servicio ${ai.service} reiniciado\n${result}`,
      });
    }

    if (ai.action === "run_command") {
      if (!isAllowedCommand(ai.command)) {
        return res.json({
          role: "assistant",
          content: "Comando no permitido",
        });
      }

      const result = await run(ai.command);

      return res.json({
        role: "assistant",
        content: result,
      });
    }

    /* ===== CHAT NORMAL ===== */
    return res.json({
      role: "assistant",
      content: ai.response,
    });

  } catch (error) {
    res.status(500).json({
      error: error.toString(),
    });
  }
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 IA funcionando en http://localhost:${PORT}`);
});
