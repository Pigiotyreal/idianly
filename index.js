const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const bodyParser = require('body-parser');
const session = require("express-session");
const app = express();
const port = process.env.PORT || 3000;
const db = new sqlite3.Database("./main.db");
require("dotenv").config();

app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}));

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, email TEXT UNIQUE, password TEXT)", (err) => {
        if (err) {
          reject(err);
        } else {
          console.log("Connected to the database!");
          resolve();
        }
      });
    });
  });
};

initializeDatabase();

const closeDatabaseConnection = () => {
  db.close((err) => {
    if(err) {
      console.error(err.message);
    }
    console.log("Closed the database connection");
    process.exit(0);
  });
};

process.on("SIGINT", closeDatabaseConnection);

const renderTemplate = (template, data = {}) => (req, res) => {
  const { username } = req.session;
  res.render(template, { ...data, username });
};

app.get("/", renderTemplate("index"));

app.get("/signup", renderTemplate("signup"));

app.get("/app", (req, res) => {
  if (req.session.username) {
    res.render("app");
  } else {
    res.redirect("/");
  }
});

app.post('/signup', async (req, res) => {
  
});

app.post("/", async (req, res) => {
  
});

app.listen(port, async () => {
  console.log(`Now listening on port ${port}!`);
});