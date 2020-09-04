const express = require("express");
const path = require("path");
const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const { v1: uuidv1 } = require("uuid");
const app = express();

//[set-up multer]
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "images");
  },
  filename: function (req, file, cb) {
    cb(null, uuidv1());
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

//[constants]
const MONGO_URI =
  "mongodb://root:root@cluster0-shard-00-00.2tcmk.mongodb.net:27017,cluster0-shard-00-01.2tcmk.mongodb.net:27017,cluster0-shard-00-02.2tcmk.mongodb.net:27017/messages?ssl=true&replicaSet=atlas-e4dmvy-shard-0&authSource=admin&retryWrites=true&w=majority";

//[set-up middlewares]
app.use(bodyParser.json()); //sets header with application/json
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(multer({ storage: storage, fileFilter: fileFilter }).single("image"));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  next();
});

//[routes]
app.use("/feed", feedRoutes);
app.use("/auth", authRoutes);

app.use((err, req, res, next) => {
  console.log(err);
  const statusCode = err.statusCode || 500;
  const message = err.message;
  const data = err.data;
  res.status(statusCode).json({ message: message, data: data });
});

mongoose
  .connect(MONGO_URI)
  .then((result) => {
    console.log("Aplicacion iniciada");
  })
  .catch((err) => {
    console.log(err);
  });
app.listen(8080);
