import { createRuntime } from "./createRuntime.js";
import { operationalLogger } from "./logger.js";

const { app, configuration, repository } = createRuntime();
const server = app.listen(configuration.port, () => {
  operationalLogger.info("server_started", {
    port: configuration.port,
    environment: configuration.nodeEnvironment,
    servesClient: configuration.serveClient,
  });
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  operationalLogger.info("server_shutdown_started", { signal });
  const forceExit = setTimeout(() => {
    operationalLogger.error("server_shutdown_timeout");
    process.exit(1);
  }, 10_000);
  forceExit.unref();
  server.close(() => {
    repository.close();
    operationalLogger.info("server_shutdown_complete");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (error) => {
  operationalLogger.error("uncaught_exception", { errorName: error?.name ?? "Error" });
  shutdown("uncaughtException");
});
process.on("unhandledRejection", (error) => {
  operationalLogger.error("unhandled_rejection", { errorName: error?.name ?? "Error" });
  shutdown("unhandledRejection");
});
