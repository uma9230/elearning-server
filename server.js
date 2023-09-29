import express from "express";
import cors from "cors";
import { readdirSync } from "fs";
import mongoose from "mongoose";
import csrf from "csurf";
import cookieParser from "cookie-parser";
const morgan = require("morgan");
require("dotenv").config();
// const PORT = process.env.PORT || 8000;
const host = "0.0.0.0";

const csrfProtection = csrf({ cookie: true });

const app = express();

mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("***DB connected***"))
  .catch((err) => console.log("DB connection error", err));

//middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

//route
readdirSync("./routers").map((r) => {
  app.use("/api", require(`./routers/${r}`));
});

//csrf
app.use(csrfProtection);

app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

//port

app.listen(process.env.PORT || 8000, () => {
  console.log(`server is running on port ${process.env.PORT || 8000}`);
});
