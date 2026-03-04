const express = require("express");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ---------------------------------- */
/* Helper para ejecutar comandos      */
/* ---------------------------------- */

function run(command) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { maxBuffer: 1024 * 1024 * 20 },
      (error, stdout, stderr) => {

        if (error && !stdout) {
          return reject(stderr || error.message);
        }

        resolve({ stdout, stderr });
      }
    );
  });
}

/* ---------------------------------- */
/* Función que interactúa con Warp    */
/* ---------------------------------- */

async function sendToWarp(message) {

  try {

    /* Traer Warp al frente */
    try {
      await run(`wmctrl -x -a warp.Warp`);
      await new Promise(r => setTimeout(r, 700));
    } catch(e){}

    /* Limpiar archivo de salida */
    await run(`rm -f /tmp/warp_output.txt`);
    await run(`touch /tmp/warp_output.txt`);
    await run(`chmod 666 /tmp/warp_output.txt`);

    /* Solo la petición (NO prompts largos) */
    const safeMessage = message.replace(/"/g, '\\"');

    /* Abrir Warp AI */
    await run(`xdotool key ctrl+grave`);
    await new Promise(r => setTimeout(r, 500));

    /* Escribir petición */
    await run(`xdotool type --delay 15 "${safeMessage}"`);
    await new Promise(r => setTimeout(r, 300));

    /* Pedir sugerencia */
    await run(`xdotool key Return`);

    /* Esperar a que Warp genere el comando */
    await new Promise(r => setTimeout(r, 2000));

    /* Seleccionar sugerencia */
    await run(`xdotool key Tab`);
    await new Promise(r => setTimeout(r, 200));

    /* Ejecutar comando */
    await run(`xdotool key Return`);

    /* Esperar salida real */
    let finalOutput = "";

    for (let i = 0; i < 60; i++) {

      await new Promise(r => setTimeout(r, 1000));

      const result = await run(`cat /tmp/warp_output.txt`);

      finalOutput = (result.stdout + result.stderr).trim();

      if (finalOutput.length > 0) {
        break;
      }

    }

    /* Debug útil */
    console.log("----- WARP OUTPUT -----");
    console.log(finalOutput);
    console.log("-----------------------");

    if (!finalOutput) {
      return `Acción ejecutada: ${message}`;
    }

    return finalOutput;

  } catch (error) {

    return `Error interactuando con Warp:\n${error}`;

  }
}

/* ---------------------------------- */
/* Endpoint chat                      */
/* ---------------------------------- */

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

/* ---------------------------------- */

app.listen(PORT, () => {

  console.log(`Servidor Warp UI activo en puerto ${PORT}`);

});
