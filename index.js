const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const app = express()
const port = 3000

app.set("view engine", "ejs")

const db = new sqlite3.Database("./main.db", (err) => {
    if(err) {
        console.error(err.message)
    }
    console.log("Connected to the database!")
})

process.on("SIGINT", () => {
    db.close((err) => {
        if(err) {
            console.error(err.message)
        }
        console.log("Closed the database connection")
        process.exit(0)
    })
})

app.get("/", (req, res) => {
    res.render("index")
})

app.get("/signup", (req, res) => {
    res.render("signup")
})

app.get("/app", (req, res) => {
    res.render("app")
})

app.listen(port, () => {
    console.log(`Now listening on port ${port}!`)
})