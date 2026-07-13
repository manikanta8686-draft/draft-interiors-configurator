import { createRuntime } from "./createRuntime.js";

const { app, configuration, repository } = createRuntime();
const server = app.listen(configuration.port, () => {
  console.log(`Draft Interiors API listening on http://localhost:${configuration.port}`);
});

function shutdown() {
  server.close(() => {
    repository.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
