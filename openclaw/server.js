const express = require("express");
const { exec } = require("child_process");
const util = require("util");

const run = util.promisify(exec);

const app = express();
app.use(express.json());

const PORT = 3000;

/* -------------------------------------------------- */
/* FUNCION PRINCIPAL                                 */
/* -------------------------------------------------- */

async function sendToWarp(message) {
  try {
    // Traer Warp al frente
    await run(`wmctrl -x -a warp.Warp`);
    await new Promise(r => setTimeout(r, 1000));

    // Limpiar archivo anterior
    await run(`rm -f /tmp/warp_output.txt`);

    const safeMessage = `
Convierte la petición a un comando Linux válido.
Ejecuta SOLO el comando.
No expliques nada.
Redirige la salida EXACTAMENTE así:

<comando> > /tmp/warp_output.txt 2>&1

Petición: ${message}
    `.replace(/"/g, '\\"');

    // Escribir mensaje
    await run(`xdotool type --delay 10 "${safeMessage}"`);
    await new Promise(r => setTimeout(r, 300));
    await run(`xdotool key Return`);

    /* -------------------------------------------- */
    /* Esperar a que se cree el archivo             */
    /* -------------------------------------------- */

    let exists = false;

    for (let i = 0; i < 120; i++) { // hasta 60s
      await new Promise(r => setTimeout(r, 500));

      const check = await run(
        `test -f /tmp/warp_output.txt && echo yes || echo no`
      );

      if (check.stdout.trim() === "yes") {
        exists = true;
        break;
      }
    }

    if (!exists) {
      return "Warp no generó archivo de salida.";
    }

    /* -------------------------------------------- */
    /* Esperar a que deje de crecer                 */
    /* -------------------------------------------- */

    let lastSize = 0;
    let stableCount = 0;

    for (let i = 0; i < 120; i++) { // hasta 60s
      await new Promise(r => setTimeout(r, 500));

      const sizeResult = await run(`stat -c%s /tmp/warp_output.txt`);
      const size = parseInt(sizeResult.stdout.trim());

      if (size === lastSize) {
        stableCount++;
        if (stableCount >= 4) break; // 2 segundos estable
      } else {
        stableCount = 0;
        lastSize = size;
      }
    }

    /* -------------------------------------------- */
    /* Leer salida final                            */
    /* -------------------------------------------- */

    const output = await run(
      `cat /tmp/warp_output.txt 2>&1 || echo ""`
    );

    return output.stdout.trim() || "Comando ejecutado sin salida.";

  } catch (error) {
    return `Error interactuando con Warp:\n${error}`;
  }
}

/* -------------------------------------------------- */
/* ENDPOINT                                           */
/* -------------------------------------------------- */

app.post("/webhook", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Falta el campo message" });
  }

  console.log("Petición recibida:", message);

  const result = await sendToWarp(message);

  res.json({
    success: true,
    output: result
  });
});

/* -------------------------------------------------- */

app.listen(PORT, () => {
  console.log(`Servidor Warp UI activo en puerto ${PORT}`);
});

