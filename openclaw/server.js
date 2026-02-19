const express = require("express");
const { exec } = require("child_process");

const app = express();
app.use(express.json());

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
}

async function runWarp(message) {
  try {
    await run(`wmctrl -x -a warp.Warp`);
    await new Promise(r => setTimeout(r, 800));

    const safeMessage = `
Ejecuta directamente el comando necesario.
No expliques nada.
{ ${message} ; } > /tmp/warp_output.txt 2>&1
    `.replace(/"/g, '\\"');

    await run(`xdotool type --delay 5 "${safeMessage}"`);
    await new Promise(r => setTimeout(r, 300));
    await run(`xdotool key Return`);

  } catch (e) {
    console.log("Error Warp:", e);
  }
}

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  runWarp(message); // 🔥 NO await
  res.json({ status: "processing" });
});

app.get("/result", async (req, res) => {
  try {
    const output = await run(`cat /tmp/warp_output.txt 2>/dev/null || echo "No output yet"`);

    if (!output.trim()) {
      return res.json({ status: "running" });
    }

    res.json({ status: "done", output });

  } catch (e) {
    res.json({ status: "error", error: e.toString() });
  }
});

app.listen(3000, () => {
  console.log("Servidor activo en puerto 3000");
});

