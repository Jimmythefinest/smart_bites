const express = require("express");
const { router: apiRouter } = require("./routes/api");

function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/api", apiRouter);

  app.use((err, _req, res, _next) => {
    if (err.code === "23505") {
      return res.status(409).json({ error: "duplicate value violates unique constraint" });
    }

    if (err.code === "23503") {
      return res.status(400).json({ error: "invalid reference value" });
    }

    const status = err.status || 500;
    const message = status >= 500 ? "internal server error" : err.message;
    return res.status(status).json({ error: message });
  });

  return app;
}

module.exports = {
  createApp,
};
