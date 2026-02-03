import { uhono } from "./src";
import { requestId, logger, cors, errorHandler } from "./src/plugins";

const app = uhono({
  plugins: [requestId(), logger(), errorHandler(), cors()],
});

app.get("/", (c) => {
  const id = c.get("requestId");
  return c.json({
    message: "Hello UHono!",
    requestId: id,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    requestId: c.get("requestId"),
  });
});

app.get("/error", () => {
  throw new Error("Test error");
});

export default {
  port: 3000,
  fetch: app.fetch,
};
