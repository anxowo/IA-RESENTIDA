const express = require("express");
const { execSync } = require("child_process");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {

  const message = req.body.message;

  if (!message) {
    return res.send("No message received.");
  }

  try {
    // Activar ventana Warp
    execSync("wmctrl -a Warp");

    // Escribir mensaje
    execSync(`xdotool type "${message}"`);

    // Pulsar Enter
    execSync("xdotool key Return");

    // Esperar a que Warp responda
    await new Promise(r => setTimeout(r, 3000));

    // Seleccionar todo y copiar
    execSync("xdotool key ctrl+a");
    execSync("xdotool key ctrl+c");

    // Leer clipboard
    const output = execSync("xclip -o -selection clipboard").toString();

    res.send(output);

  } catch (err) {
    res.send("Error interactuando con Warp:\n" + err.message);
  }

});

app.listen(3000, () => {
  console.log("Servidor usando Warp GUI en puerto 3000");
});

