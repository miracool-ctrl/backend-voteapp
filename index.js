require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const path = require("path");

const Routes = require("./routes/Routes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Allow CORS (localhost + deployed frontend)
app.use(
  cors({
    credentials: true,
    origin: [
      "http://localhost:3000",    // dev
      process.env.FRONTEND_URL    // production (set in .env)
    ].filter(Boolean),
  })
);

// ✅ File upload middleware
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// ✅ Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api", Routes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

// ✅ Connect DB + start server
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`Server started on port ${PORT}`)
    );
  })
  .catch((err) => console.log("MongoDB connection error:", err));
