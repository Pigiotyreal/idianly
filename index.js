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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const uppercaseRegex = /[A-Z]/
  const numberRegex = /[0-9]/
  const usernameRegex = /^[a-zA-Z0-9_-]{3,32}$/
  const errors = []
  const saltRounds = 10

  if(!usernameRegex.test(username)) {
    errors.push("Username is invalid, must be 3-32 characters in length and can only use letters, numbers, hypens, and underscores")
  }

  if(!emailRegex.test(email) || email.length < 8 || email.length > 50) {
    errors.push("Email is invalid, must be 8-50 characters in length")
  }

  if(!uppercaseRegex.test(password) || !numberRegex.test(password) || password.length < 6 || password.length > 72) {
    errors.push("Password is invalid, you need at least one uppercase letter and one number")
  }

  if(errors.length > 0) {
    res.render("signup", {errors})
  } else {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);
    
        await db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    
        res.send('User created successfully');
      } catch (error) {
        console.error('Error hashing password:', error);
        errors.push("Error hasing password")

        if(errors.length > 0) {
            res.render("signup", {errors})
        }
    }
  }
});

app.post("/", async (req, res) => {
  const { email, password } = req.body;
  const errors = []

  try {
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) {
      errors.push("Incorrect email or password");
      if(errors.length > 0) {
        res.render("index", {errors})
      }
    }

    if(errors.length > 0) {
        res.render("index", {errors})
    } else {
        const passMatch = await bcrypt.compare(password, user.password);

        if (!passMatch) {
            errors.push("Incorrect email or password");
            if(errors.length > 0) {
                res.render("index", {errors})
            }
        }

        req.session.username = user.username;
        res.redirect("/app");
    }
  } catch (err) {
    console.error(err.message);
    errors.push("Email or password is not valid");
    if(errors.length > 0) {
        res.render("index", {errors})
    }
  }
});

app.listen(port, () => {
  console.log(`Now listening on port ${port}!`);
});