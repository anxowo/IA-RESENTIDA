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
        // Envolvemos el comando en la CLI de Warp
        const warpCommand = `warp-cli run "${command}"`;
        
        exec(warpCommand, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

module.exports = executeCommand;
