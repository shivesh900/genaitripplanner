// Local entry point: `npm start` → http://localhost:5000 (the Vite dev server proxies /api here).
const app = require("./api/index.js");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AI Trip Planner API running → http://localhost:${PORT}`));
