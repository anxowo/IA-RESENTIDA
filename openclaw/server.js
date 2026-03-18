const express = require("express");
const axios = require("axios");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;

app.use(express.json());

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
  "whoami"
];

function isAllowedCommand(cmd) {
  return allowedCommands.includes(cmd);
}

/* =========================
   OLLAMA (RÁPIDO)
========================= */
async function askOllama(message) {
  const prompt = `
Responde SOLO JSON:

chat:
{"action":"chat","response":"texto"}

restart:
{"action":"restart_service","service":"ssh"}

cmd:
{"action":"run_command","command":"uptime"}

Usuario: ${message}
`;

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi3:mini",
      prompt,
      stream: false,
      options: {
        num_predict: 100
      }
    });

    let text = response.data.response.trim();

    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);

    return { action: "chat", response: text };

  } catch (e) {
    return { action: "chat", response: "Error IA" };
  }
}

/* =========================
   ENDPOINT
========================= */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const msg = message.toLowerCase();

    /* =========================
       RESPUESTAS RÁPIDAS (SIN IA)
    ========================= */

    if (msg.includes("memoria")) {
      const result = await run("free -m");
      return res.json({ role: "assistant", content: result });
    }

    if (msg.includes("disco")) {
      const result = await run("df -h");
      return res.json({ role: "assistant", content: result });
    }

    if (msg.includes("uptime") || msg.includes("tiempo")) {
      const result = await run("uptime");
      return res.json({ role: "assistant", content: result });
    }

    if (msg.includes("usuario") || msg.includes("quien soy")) {
      const result = await run("whoami");
      return res.json({ role: "assistant", content: result });
    }

    /* =========================
       IA
    ========================= */

    const ai = await askOllama(message);

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
        content: `Servicio ${ai.service} reiniciado\n${result}`
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
  console.log(`🚀 IA rápida en http://localhost:${PORT}`);
});
