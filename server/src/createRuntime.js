import { createApp } from "./app.js";
import { ConfigurationService } from "./configurationService.js";
import { readEnvironment } from "./config.js";
import { SqliteConfigurationRepository } from "./repositories/sqliteConfigurationRepository.js";

export function createRuntime(environment = process.env) {
  const configuration = readEnvironment(environment);
  const repository = new SqliteConfigurationRepository(configuration.databasePath);
  const configurationService = new ConfigurationService(repository);
  const app = createApp({
    configurationService,
    jsonBodyLimit: configuration.jsonBodyLimit,
  });
  return { app, configuration, repository };
}
