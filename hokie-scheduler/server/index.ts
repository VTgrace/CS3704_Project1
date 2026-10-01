import { createApp } from "./app";
import { config } from "./config";
// Local prototype only. Add application auth and deployment controls before public hosting.
const server = createApp().listen(config.port, "127.0.0.1", () =>
  console.log(`Hokie Scheduler API: http://127.0.0.1:${config.port}`),
);
server.requestTimeout = 45000;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
