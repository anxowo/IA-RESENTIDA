const { execSync } = require("child_process");

function sendToWarp(message) {
  try {
    execSync("wmctrl -a Warp");
    execSync(`xdotool type "${message}"`);
    execSync("xdotool key Return");
  } catch (err) {
    console.log("Warp no disponible:", err.message);
  }
}

module.exports = sendToWarp;

