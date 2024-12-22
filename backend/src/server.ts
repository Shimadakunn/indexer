import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import userOpsRouter from "./api";
import { config } from "./config";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", userOpsRouter);

app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port}`);
});

export default app;
