const express = require("express");
const { exec } = require("child_process");

console.log("INICIO DEL SERVIDOR...");

const app = express();
app.use(express.json());

/* ===============================
   FUNCIONES AUXILIARES
================================= */

// Interpretador simple (puedes mejorar luego)
function interpret(message) {
  message = message.toLowerCase();

  if (message.includes("servicios")) {
    return {
      action: "list_services"
    };
  }

  if (message.includes("reinicia") && message.includes("apache")) {
    return {
      action: "restart_apache"
    };
  }

  return null;
}

// Mapeo intención → comando
function mapToCommand(intent) {
  switch (intent.action) {
    case "list_services":
      return "systemctl list-units --type=service --state=running --no-legend";

    case "restart_apache":
      return "systemctl restart apache2";

    default:
      return null;
  }
}

// Seguridad básica
function validateCommand(command) {
  const forbidden = ["rm ", "mkfs", "dd ", "shutdown", "reboot", "poweroff", "&&", ";", "|"];

  for (let word of forbidden) {
    if (command.includes(word)) {
      return false;
    }
  }

  return true;
}

// Ejecutar comando con timeout
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, {
      maxBuffer: 1024 * 1024,
      timeout: 5000
    }, (error, stdout, stderr) => {
      if (error) {
        return reject(error.message);
      }
      resolve(stdout || stderr);
    });
  });
}

/* ===============================
   ENDPOINT
================================= */

app.post("/webhook", async (req, res) => {
  console.log("Petición recibida:", req.body);

  const message = req.body.message;

  if (!message) {
    return res.send("[openclaw] No se recibió mensaje.");
  }

  const intent = interpret(message);
  if (!intent) {
    return res.send("[openclaw] No entiendo la petición.");
  }

  const command = mapToCommand(intent);
  if (!command) {
    return res.send("[openclaw] No puedo ejecutar esa acción.");
  }

  if (!validateCommand(command)) {
    return res.send("[openclaw] Comando bloqueado por seguridad.");
  }

  try {
    const result = await executeCommand(command);
    return res.send("[openclaw]\n\n" + result);
  } catch (err) {
    console.error("Error ejecutando comando:", err);
    return res.send("[openclaw] Error:\n" + err);
  }
});

/* ===============================
   ARRANQUE DEL SERVIDOR
================================= */

const PORT = 3000;

const server = app.listen(PORT, () => {
  console.log(`OpenClaw corriendo en puerto ${PORT}`);
});

server.on("error", (err) => {
  console.error("ERROR AL INICIAR EL SERVIDOR:", err);
});

// Mantener proceso vivo explícitamente
setInterval(() => {
  console.log("Servidor activo...");
}, 10000);

