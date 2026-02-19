const express = require("express");
const { exec } = require("child_process");

const app = express();
app.use(express.json());

const PORT = 3000;

/* -------------------------------------------------- */
/* RUN con buffer grande                             */
/* -------------------------------------------------- */

function run(command) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { maxBuffer: 1024 * 1024 * 10 }, // 10MB
      (error, stdout, stderr) => {
        if (error && !stdout) {
          return reject(stderr || error.message);
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

/* -------------------------------------------------- */
/* FUNCION PRINCIPAL                                 */
/* -------------------------------------------------- */

async function sendToWarp(message) {
  try {
    // Traer Warp al frente
    await run(`wmctrl -x -a warp.Warp`);
    await new Promise(r => setTimeout(r, 1000));

    // Borrar archivo anterior
    await run(`rm -f /tmp/warp_output.txt`);

    const safeMessage = `
Convierte la petición a un comando Linux válido.
Ejecuta SOLO el comando.
No expliques nada.
Redirige la salida EXACTAMENTE así:

<comando> > /tmp/warp_output.txt 2>&1

Petición: ${message}
    `.replace(/"/g, '\\"');

    // Escribir en Warp
    await run(`xdotool type --delay 10 "${safeMessage}"`);
    await new Promise(r => setTimeout(r, 300));
    await run(`xdotool key Return`);

    /* -------------------------------------------- */
    /* Esperar a que el archivo exista              */
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
    /* Esperar a que el archivo deje de crecer      */
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

    const outputResult = await run(
      `cat /tmp/warp_output.txt 2>&1 || echo ""`
    );

    const finalOutput = outputResult.stdout.trim();

    if (!finalOutput) {
      return "Comando ejecutado sin salida.";
    }

    return finalOutput;

  } catch (error) {
    return `Error interactuando con Warp:\n${error}`;
  }
}

/* -------------------------------------------------- */
/* ENDPOINT                                           */
/* -------------------------------------------------- */

app.post("/webhook", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Falta el campo message"
      });
    }

    console.log("Petición recibida:", message);

    const result = await sendToWarp(message);

    res.json({
      success: true,
      output: result
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.toString()
    });
  }
});

/* -------------------------------------------------- */

app.listen(PORT, () => {
  console.log(`Servidor Warp UI activo en puerto ${PORT}`);
});

