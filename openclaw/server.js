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
  "whoami"
];

function isAllowedCommand(cmd) {
  return allowedCommands.includes(cmd);
}

/* =========================
   OLLAMA (ROBUSTO)
========================= */
async function askOllama(message) {
const prompt = `
Eres un asistente de sistema Linux.

RESPONDE SIEMPRE en JSON válido SIN texto extra.

Reglas estrictas:
- NO expliques nada fuera del JSON
- NO uses markdown
- NO pongas texto antes o después
- SOLO devuelve JSON válido

Formatos permitidos:

CHAT:
{"action":"chat","response":"texto"}

REINICIAR:
{"action":"restart_service","service":"ssh"}

COMANDO:
{"action":"run_command","command":"uptime"}

Si la pregunta NO es de sistema → usa "chat"

Usuario: ${message}
`;

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi3:mini",
      prompt,
      stream: false,
      timeout: 60000,
      options: {
        num_predict: 50,
        temperature: 0.2
      }
    });

    let text = response.data.response?.trim();

    if (!text) {
      return {
        action: "chat",
        response: "No hay respuesta del modelo"
      };
    }

    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        // 🔥 fallback si JSON falla
        return {
          action: "chat",
          response: text
        };
      }
    }

    // 🔥 fallback final
    return {
      action: "chat",
      response: text
    };

  } catch (e) {
    console.error("ERROR OLLAMA:", e.message);

    return {
      action: "chat",
      response: "La IA está ocupada, intenta otra vez"
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

    /* =========================
       RESPUESTAS RÁPIDAS
    ========================= */

    if (msg.includes("hola") || msg.includes("que tal")) {
      return res.json({
        role: "assistant",
        content: "Todo bien 👌 ¿en qué te ayudo?"
      });
    }

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

    if (msg.includes("reinicia ssh")) {
      const result = await run("systemctl restart ssh");
      return res.json({
        role: "assistant",
        content: "SSH reiniciado\n" + result
      });
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
      content: ai.response || "Sin respuesta"
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
