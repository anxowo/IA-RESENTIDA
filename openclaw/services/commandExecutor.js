//const { exec } = require("child_process");

//function executeCommand(command) {
  //return new Promise((resolve, reject) => {
    //exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      //if (error) {
        //reject(stderr || error.message);
      //} else {
        //resolve(stdout);
      //}
    //});
  //});
//}

//module.exports = executeCommand;


const { exec } = require("child_process");

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        // Ejecución limpia y directa en el bash de Ubuntu
        exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                // Si el comando falla (ej. Apache no existe), capturamos el error
                reject(stderr || error.message);
            } else {
                // Si funciona, devolvemos el resultado
                resolve(stdout);
            }
        });
    });
}

module.exports = executeCommand;
