import { createApp } from "./app.js";
import { ConfigurationService } from "./configurationService.js";
import { EnquiryService } from "./enquiryService.js";
import { readEnvironment } from "./config.js";
import { SqliteConfigurationRepository } from "./repositories/sqliteConfigurationRepository.js";
import { SmtpEnquiryNotifier } from "./smtpEnquiryNotifier.js";
import { AdminAuthService } from "./adminAuthService.js";
import { AdminService } from "./adminService.js";

export function createRuntime(environment = process.env) {
  const configuration = readEnvironment(environment);
  const repository = new SqliteConfigurationRepository(configuration.databasePath);
  const configurationService = new ConfigurationService(repository);
  const notifier = configuration.smtp
    ? new SmtpEnquiryNotifier({
        ...configuration.smtp,
        recipient: configuration.enquiryRecipientEmail,
      })
    : null;
  const enquiryService = new EnquiryService(repository, { notifier });
  const adminAuthService = new AdminAuthService(configuration.admin);
  const adminService = new AdminService(repository);
  repository.purgeEnquiriesBefore(
    new Date(Date.now() - configuration.enquiryRetentionDays * 24 * 60 * 60 * 1000),
  );
  const app = createApp({
    configurationService,
    enquiryService,
    adminAuthService,
    adminService,
    jsonBodyLimit: configuration.jsonBodyLimit,
  });
  return { app, configuration, repository };
}
