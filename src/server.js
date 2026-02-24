require("dotenv").config();

const { createApp } = require("./app");
const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port, () => {
  // Keep startup log minimal and parseable.
  console.log(`API listening on http://localhost:${port}`);
});
