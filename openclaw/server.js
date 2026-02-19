const express = require("express");
const { exec } = require("child_process");

console.log("INICIANDO SERVIDOR WARP...");

const app = express();
app.use(express.json());

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
}

async function sendToWarp(message) {
  try {
    // 1️⃣ Activar ventana Warp
    await run(`wmctrl -a Warp`);

    // pequeña pausa
    await new Promise(r => setTimeout(r, 500));

    // 2️⃣ Escribir mensaje
    await run(`xdotool type --delay 5 "${message.replace(/"/g, '\\"')}"`);

    // 3️⃣ Pulsar Enter
    await run(`xdotool key Return`);

    // Esperar que Warp procese
    await new Promise(r => setTimeout(r, 4000));

    // 4️⃣ Seleccionar todo (Ctrl+Shift+A en Warp selecciona bloque)
    await run(`xdotool key ctrl+shift+a`);
    await new Promise(r => setTimeout(r, 300));

    // 5️⃣ Copiar selección
    await run(`xdotool key ctrl+shift+c`);
    await new Promise(r => setTimeout(r, 500));

    // 6️⃣ Leer clipboard
    const output = await run(`xclip -o -selection clipboard`);

    return output;

  } catch (error) {
    return `Error interactuando con Warp:\n${error}`;
  }
}

app.post("/webhook", async (req, res) => {
  console.log("Petición recibida:", req.body);

  const message = req.body.message;

  if (!message) {
    return res.send("No se recibió mensaje");
  }

  try {
    const result = await sendToWarp(message);
    res.send(result);
  } catch (err) {
    res.send("Error:\n" + err);
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor Warp UI activo en puerto ${PORT}`);
});

