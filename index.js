const express = require("express")
const app = express()
const port = 3000

app.set("view engine", "ejs")

app.get("/", (req, res) => {
    res.render("index")
})

app.get("/signup", (req, res) => {
    res.render("signup")
})

app.listen(port, () => {
    console.log(`Now listening on port ${port}!`)
})