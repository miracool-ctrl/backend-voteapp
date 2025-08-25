// require('dotenv').config();
// const mongoose = require('mongoose');

// mongoose.connect(process.env.MONGO_URL)
//   .then(() => console.log('MongoDB connected'))
//   .catch((err) => console.error('MongoDB connection error:', err));

// // ...existing code...


// const express = require("express");
// const cors = require("cors");
// const { connect } = require("mongoose");
// require("dotenv").config();
// // const upload = require("express-fileupload");
// const fileUpload = require("express-fileupload");

// const Routes = require("./routes/Routes");
// const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// const app = express();
// app.use(express.json({ extended: true }));
// app.use(express.urlencoded({ extended: true }));
// app.use(cors({ credentials: true, origin: ["http://localhost:3000"] }));
// app.use(upload());

// app.use("/api", Routes);

// app.use(notFound);
// app.use(errorHandler);
// app.use(fileUpload({
//   useTempFiles: true,          // allows access to req.files.thumbnail.tempFilePath
//   tempFileDir: "/tmp/",        // temporary folder for uploads
// }));

// connect(process.env.MONGO_URL)
//   .then(
//     app.listen(5000, () =>
//       console.log("server started on port ${process.env.PORT}")
//     )
//   )
//   .catch((err) => console.log(err));



require('dotenv').config();
const mongoose = require('mongoose');
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");

const Routes = require("./routes/Routes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: ["http://localhost:3000"] }));

// ✅ Correct file upload setup (only once)
app.use(fileUpload({
  useTempFiles: true,          // allows access to req.files.thumbnail.tempFilePath
  tempFileDir: "/tmp/",        // temporary folder for uploads
}));

// Routes
app.use("/api", Routes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

// ✅ Connect DB + start server
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log(`server started on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => console.log("MongoDB connection error:", err));
