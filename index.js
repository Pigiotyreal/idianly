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

const initializeDatabase = async () => {
  try {
    await db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, email TEXT UNIQUE, password TEXT)");
    console.log("Connected to the database!");
  } catch (err) {
    console.error(err.message);
  }
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
  const { username, email, password } = req.body;
  const saltRounds = 10;

  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

    res.send('User created successfully');
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).send('Internal server error');
  }
});

app.post("/", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) {
      res.status(401).send("Incorrect email or password");
      return;
    }

    const passMatch = await bcrypt.compare(password, user.password);

    if (!passMatch) {
      res.status(401).send("Incorrect email or password");
      return;
    }

    req.session.username = user.username;
    res.redirect("/app");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal server error");
  }
});

app.listen(port, () => {
  console.log(`Now listening on port ${port}!`);
});