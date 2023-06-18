const express = require('express');
const app = express();
const cors = require("cors")

app.use(express.json());
app.use(express.static("./public"))
app.use(cors())

app.get('/test', (req, res) => {
    res.send('Hello World!');
})


module.exports = app;
