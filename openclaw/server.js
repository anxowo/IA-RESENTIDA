const express = require("express");
const { exec } = require("child_process");

const app = express();
app.use(express.json());

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) return resolve(stderr || err.message);
      resolve(stdout);
    });
  });
}

async function sendToWarp(message) {
  try {
    await run(`wmctrl -x -a warp.Warp`);
    await new Promise(r => setTimeout(r, 800));

    const safeMessage = `
Ejecuta directamente el comando necesario.
No expliques nada.
Redirige la salida al archivo /tmp/warp_output.txt.

${message} > /tmp/warp_output.txt 2>&1
    `.replace(/"/g, '\\"');

    await run(`xdotool type --delay 5 "${safeMessage}"`);
    await new Promise(r => setTimeout(r, 300));
    await run(`xdotool key Return`);

    // Esperar hasta que el archivo exista y tenga contenido
    let attempts = 0;
    while (attempts < 60) { // hasta 30s
      await new Promise(r => setTimeout(r, 500));

      const exists = await run(`test -f /tmp/warp_output.txt && echo yes || echo no`);

      if (exists.trim() === "yes") {
        const size = await run(`stat -c%s /tmp/warp_output.txt`);
        if (parseInt(size) > 0) break;
      }

      attempts++;
    }

    const output = await run(`cat /tmp/warp_output.txt 2>&1 || echo ""`);

    return output.trim() || "Comando ejecutado sin salida.";

  } catch (error) {
    return `Error interactuando con Warp:\n${error}`;
  }
}

app.post("/webhook", async (req, res) => {
  const message = req.body.message;

  if (!message) {
    return res.send("No se recibió mensaje.");
  }

  const result = await sendToWarp(message);
  res.send(result);
});

const server = app.listen(3000, () => {
  console.log("Servidor Warp UI activo en puerto 3000");
});

// 🔥 Quitar timeout de Express completamente
server.setTimeout(0);

