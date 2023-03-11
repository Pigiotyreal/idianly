const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const bcrypt = require("bcrypt")
const bodyParser = require('body-parser')
const session = require("express-session")
const app = express()
const port = process.env.PORT || 3000
const db = new sqlite3.Database("./main.db")
require("dotenv").config()

app.set("view engine", "ejs")
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}))

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, email TEXT UNIQUE, password TEXT, admin BOOLEAN)", (err) => {
        if (err) {
          reject(err)
        } else {
          console.log("Connected to the database!")
          resolve()
        }
      })
    })
  })
}

initializeDatabase();

const closeDatabaseConnection = () => {
  db.close((err) => {
    if(err) {
      console.error(err.message)
    }
    console.log("Closed the database connection")
    process.exit(0)
  })
}

process.on("SIGINT", closeDatabaseConnection)

const renderTemplate = (template, data = {}) => (req, res) => {
  const { username } = req.session
  res.render(template, { ...data, username })
}

app.get("/", renderTemplate("index"))

app.get("/signup", renderTemplate("signup"))

app.get("/app", (req, res) => {
  const {username} = req.session

  if (username) {
    res.render("app", {username})
  } else {
    res.redirect("/")
  }
})

app.post('/signup', async (req, res) => {
  const {username, email, password} = req.body
  const hashedPass = await bcrypt.hash(password, 10)

  const errors = []
  if(!username) {
    errors.push("Username is required")
  }
  if(!email) {
    errors.push("Email is required")
  }
  if(!password) {
    errors.push("Password is required")
  }

  try {
    const existingUser = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", email, (err, row) => {
        if(err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })

    if(existingUser) {
      res.render("signup", {errors: ["User already exists"]})
    } else {
      const newUser = await new Promise((resolve, reject) => {
        db.run("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPass], function(err) {
          if(err) {
            reject(err)
          } else {
            resolve({id: this.lastID})
          }
        })
      })

      req.session.username = username
      res.redirect("/app")
    }
  } catch(err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

app.post("/", async (req, res) => {
  const {email, password} = req.body

  const errors = []
  if(!email) {
    errors.push("Email is required")
  }
  if(!password) {
    errors.push("Password is required")
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", email, (err, row) => {
        if(err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })

    if(!user) {
      res.render("index", {errors: ["Invalid email or password"]})
    } else {
      const passMatch = await bcrypt.compare(password, user.password)
    
      if(passMatch) {
        req.session.username = user.username
        res.redirect("/app")
      } else {
        res.render("index", {errors: ["Invalid email or password"]})
      }
    }
  } catch(err) {
    console.error(err)
    res.status(500).send("Server error")
  }
})

app.listen(port, async () => {
  console.log(`Now listening on port ${port}!`)
})