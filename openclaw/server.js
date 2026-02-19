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
    // Activar Warp
    await run(`wmctrl -x -a warp.Warp`);
    await new Promise(r => setTimeout(r, 1000));

    const safeMessage = message.replace(/"/g, '\\"');

    // Escribir mensaje
    await run(`xdotool type --delay 5 "${safeMessage}"`);
    await new Promise(r => setTimeout(r, 300));
    await run(`xdotool key Return`);

    // 🔥 Esperar a que Warp piense y ejecute
    await new Promise(r => setTimeout(r, 10000));

    // Obtener último comando ejecutado en bash
    await run(`xdotool type "fc -ln -1 > /tmp/last_command.txt"`);
    await run(`xdotool key Return`);
    await new Promise(r => setTimeout(r, 1000));

    const lastCommand = await run(`cat /tmp/last_command.txt`);
    const cleanCommand = lastCommand.trim();

    if (!cleanCommand) {
      return "No se pudo detectar el comando ejecutado por Warp.";
    }

    // Ejecutar el comando directamente y capturar salida real
    const output = await run(`${cleanCommand} 2>&1`);

    return output || "Comando ejecutado sin salida.";

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

