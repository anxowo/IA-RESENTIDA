function interpret(message) {
  message = message.toLowerCase();

  if (message.includes("servicios")) {
    return { action: "list_services", state: "running" };
  }

  if (message.includes("reinicia") && message.includes("apache")) {
    return { action: "restart_service", service: "apache2" };
  }

  if (message.includes("cpu")) {
    return { action: "system_stats", metric: "cpu" };
  }

  return null;
}

module.exports = interpret;

