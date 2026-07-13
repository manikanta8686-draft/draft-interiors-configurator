import { readEnvironment } from "./config.js";
import { SqliteConfigurationRepository } from "./repositories/sqliteConfigurationRepository.js";

const { databasePath } = readEnvironment();
const repository = new SqliteConfigurationRepository(databasePath);
repository.close();
console.log(`SQLite migrations are up to date: ${databasePath}`);
