function write(stream, level, event, details = {}) {
  stream.write(`${JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  })}\n`);
}

export const operationalLogger = {
  info(event, details) {
    write(process.stdout, "info", event, details);
  },
  error(event, details) {
    write(process.stderr, "error", event, details);
  },
};
