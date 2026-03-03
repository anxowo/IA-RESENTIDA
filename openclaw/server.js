const express = require("express");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* -------------------------------------------------- */
/* RUN helper                                         */
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
/* FUNCION PRINCIPAL                                  */
/* -------------------------------------------------- */

async function sendToWarp(message) {
  try {

    // Intentar traer Warp al frente (si falla, seguimos)
    try {
      await run(`wmctrl -x -a warp.Warp`);
      await new Promise(r => setTimeout(r, 800));
    } catch {}

    // Preparar archivo de salida
    await run(`rm -f /tmp/warp_output.txt`);
    await run(`touch /tmp/warp_output.txt`);
    await run(`chmod 666 /tmp/warp_output.txt`);

    // Prompt seguro
const safeMessage = `
Genera y ejecuta el comando Linux para: ${message}
Luego escribe una línea explicando lo hecho.
Redirige salida a /tmp/warp_output.txt 2>&1
`.replace(/"/g, '\\"');
    // Escribir en Warp
    await run(`xdotool type --delay 1 "${safeMessage}"`);
    await new Promise(r => setTimeout(r, 200));
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

    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 500));

      const sizeResult = await run(`stat -c%s /tmp/warp_output.txt`);
      const size = parseInt(sizeResult.stdout.trim());

      if (size === lastSize) {
        stableCount++;
        if (stableCount >= 4) break; // 2s estable
      } else {
        stableCount = 0;
        lastSize = size;
      }
    }

    /* -------------------------------------------- */
    /* Leer salida                                  */
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
/* ENDPOINTS                                          */
/* -------------------------------------------------- */

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Mensaje vacío"
      });
    }

    const result = await sendToWarp(message);

    res.json({
      role: "assistant",
      content: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.toString()
    });
  }
});

/* -------------------------------------------------- */

app.listen(PORT, () => {
  console.log(`Servidor Warp UI activo en puerto ${PORT}`);
});
