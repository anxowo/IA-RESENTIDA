function validateCommand(command) {
  const forbiddenPatterns = [
    "rm ",
    "mkfs",
    "dd ",
    "shutdown",
    "reboot",
    "poweroff",
    "&&",
    ";",
    "|"
  ];

  for (const pattern of forbiddenPatterns) {
    if (command.includes(pattern)) {
      return false;
    }
  }

  return true;
}

module.exports = validateCommand;

