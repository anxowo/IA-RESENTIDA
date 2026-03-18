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
    exec(command, { timeout: 8000 }, (error, stdout, stderr) => {
      if (error) return resolve(stderr || error.message);
      resolve(stdout || stderr);
    });
  });
}

/* =========================
   CONFIG MODELOS
========================= */
const FAST_MODEL = "phi3:mini";
const SMART_MODEL = "phi3";

/* =========================
   DECISIÓN DE MODELO
========================= */
function isSimple(msg) {
  return (
    msg.length < 40 ||
    msg.includes("hola") ||
    msg.includes("hora") ||
    msg.includes("memoria") ||
    msg.includes("disco") ||
    msg.includes("uptime")
  );
}

/* =========================
   OLLAMA STREAM
========================= */
async function askOllamaStream(message, res, model) {
const prompt = `
Responde MUY corto (máx 2 líneas).
Sé directo y sin explicaciones largas.

Usuario: ${message}
`;
  try {
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model,
        prompt,
        stream: true,
        options: {
          num_predict: 60,
          temperature: 0.3,
        },
      },
      {
        responseType: "stream",
      }
    );

    let fullText = "";

    response.data.on("data", (chunk) => {
      const lines = chunk.toString().split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const json = JSON.parse(line);
          if (json.response) {
            fullText += json.response;
            res.write(json.response);
          }
        } catch {}
      }
    });

    response.data.on("end", () => {
      res.end();
    });

  } catch (e) {
    console.error("ERROR STREAM:", e.message);
    res.end("Error IA");
  }
}

/* =========================
   ENDPOINT CHAT
========================= */
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Mensaje vacío" });
  }

  const msg = message.toLowerCase();

  /* ===== RESPUESTAS INSTANT ===== */
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

  if (msg.includes("uptime")) {
    const result = await run("uptime");
    return res.json({ role: "assistant", content: result });
  }

  /* ===== STREAM MODE ===== */
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  const model = isSimple(msg) ? FAST_MODEL : SMART_MODEL;

  await askOllamaStream(message, res, model);
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 ULTRA IA en http://localhost:${PORT}`);
});
