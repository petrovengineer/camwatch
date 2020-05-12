const express = require('express')
const app = express()
 
app.get('/', function (req, res) {
  res.send('Hello World on Port 5000');
})
 
console.log("test");

app.listen(4000)