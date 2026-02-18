const express = require("express");
const { exec } = require("child_process");

const app = express();
app.use(express.json());

// Esta función es "la parte Warp"
function enviarAWarp(texto, callback) {

    exec(texto, { shell: "/bin/bash" }, (error, stdout, stderr) => {

        if (error) {
            callback(stderr);
        } else {
            callback(stdout);
        }

    });

}

app.post("/mensaje", (req, res) => {

    const mensaje = req.body.mensaje;

    enviarAWarp(mensaje, (resultado) => {
        res.json({ respuesta: resultado });
    });

});

app.listen(3000, () => {
    console.log("OpenClaw activo en puerto 3000");
});

