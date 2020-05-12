const express = require('express')
const app = express()
 
app.get('/', function (req, res) {
  res.send('Hello World on Port 3000');
})
 
app.listen(4000)