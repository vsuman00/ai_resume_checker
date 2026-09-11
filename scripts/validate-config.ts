import {
  getServerConfig,
  ServerConfigError,
} from "../app/lib/server/config.ts";

try {
  getServerConfig();
} catch (error) {
  if (error instanceof ServerConfigError) {
    console.error(error.message);
  } else {
    console.error("Invalid server configuration.");
  }
  process.exitCode = 1;
}
