import { ohnana } from "./src";
import { requestId, logger, cors, errorHandler } from "./src/plugins";

const app = ohnana({
  plugins: [requestId(), logger(), errorHandler(), cors()],
});

app.get("/", (c) => {
  const id = c.get("requestId");
  return c.json({
    message: "Hello Ohnana!",
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
