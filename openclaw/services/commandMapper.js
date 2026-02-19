function mapToCommand(intent) {
  if (!intent) return null;

  switch (intent.action) {
    case "list_services":
      return "systemctl list-units --type=service --state=running --no-legend";

    case "restart_service":
      return `systemctl restart ${intent.service}`;

    case "system_stats":
      if (intent.metric === "cpu") {
        return "top -bn1 | grep 'Cpu(s)'";
      }
      break;

    default:
      return null;
  }
}

module.exports = mapToCommand;

