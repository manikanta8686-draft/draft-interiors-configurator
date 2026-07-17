import { createAdminPasswordHash } from "./adminAuthService.js";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Provide an admin password of at least 12 characters.");
  process.exit(1);
}
console.log(createAdminPasswordHash(password));
