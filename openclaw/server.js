const express = require("express");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* -------------------------------------------------- */
/* RUN helper                                        */
/* -------------------------------------------------- */

function run(command) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { maxBuffer: 1024 * 1024 * 20 }, // 20MB por si systemctl devuelve mucho
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
/* FUNCIÓN PRINCIPAL                                 */
/* -------------------------------------------------- */

async function sendToWarp(message) {
  try {
    /* Traer Warp al frente */
    try {
      await run(`wmctrl -x -a warp.Warp`);
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {}

    /* Limpiar archivo */
    await run(`rm -f /tmp/warp_output.txt`);
    await run(`touch /tmp/warp_output.txt`);
    await run(`chmod 666 /tmp/warp_output.txt`);

    /* Prompt SIMPLE */
    const safeMessage = `
Genera un comando Linux válido.
Ejecuta el comando.
Redirige la salida a /tmp/warp_output.txt 2>&1
Petición: ${message}
`.trim().replace(/"/g, '\\"');

    /* Escribir en Warp */
    await run(`xdotool type --delay 20 "${safeMessage}"`);
    await new Promise(r => setTimeout(r, 300));
    await run(`xdotool key Return`);

    /* Esperar a que el archivo tenga contenido real */
    let finalOutput = "";

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));

      const outputResult = await run(`cat /tmp/warp_output.txt`);
      finalOutput = (outputResult.stdout + outputResult.stderr).trim();

      if (finalOutput.length > 0) {
        break;
      }
    }

    /* DEBUG (puedes quitarlo luego) */
    console.log("----- DEBUG SALIDA -----");
    console.log(finalOutput);
    console.log("------------------------");

    if (!finalOutput) {
      return `✔ Acción completada correctamente: ${message}`;
    }

    return finalOutput;

  } catch (error) {
    return `Error interactuando con Warp:\n${error}`;
  }
}

/* -------------------------------------------------- */
/* ENDPOINT CHAT                                     */
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
