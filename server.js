const express = require('express')
const app = express()

var Client = require('ftp');

const pathToDates = "/cam/2F02CE5PAA00391";
const pathToImgs = "/001/jpg"
const pathToVideos = "/001/dav"
var dates = [];
var hours = [];
var c = new Client();
c.on('ready', function() {
    c.list(pathToDates,function(err, list) {
        if (err) throw err;
        list.map((item)=>{
            if(item.type==='d'){dates.push(item.name);};
        })
    });
});

c.connect({host:"smart-spb.ru",user:"ftpuser", password:"nwe97wzuUbFt!"});

app.get('/', function (req, res) {
    var links = [];
    dates.map((date)=>{
        links.push('<a href="/hours?date='+date+'">'+date+'</a>');
    })
  res.send(links.join("<br>"));
})

app.get('/hours', function (req, res) {
    var date = req.query.date;
    var pathToHours = pathToDates+'/'+date+pathToImgs;
    var hours = [];
    c.list(pathToHours, function(err, list) {
        if (err) throw err;
        list.map((item)=>{
            if(item.type==='d'){hours.push(item.name);};
        })
        var links = [];
        links.push('<div>Date:'+date+'</div>');
        links.push('<a href="/">Up</a>');
        hours.map((hour)=>{
            links.push('<a href="/minutes?hour='+hour+'&date='+date+'">'+hour+'</a>');
        })
        res.send(links.join("<br>"));
    });
})

app.get('/minutes', async function (req, res) {
    var hour = req.query.hour;
    var date = req.query.date;
    var pathToMinutes = pathToDates+'/'+date+pathToImgs+'/'+hour;
    var minutes = [];
    var pathToV = pathToDates+'/'+date+pathToVideos+'/'+hour;
    var videos = [];
    await new Promise((resolve, reject)=>{
        c.list(pathToV, function(err, list){
            if (err) reject(err);
            list.map((item)=>{
                if(item.type!=='d' && item.name.indexOf(".dav")!==-1){videos.push(item.name);};
            })
            resolve();
        });
    });
    console.log("VIDEOS: ",videos);
    c.list(pathToMinutes, function(err, list) {
        if (err) throw err;
        list.map((item)=>{
            if(item.type==='d'){minutes.push(item.name);};
        })
        var links = [];

        links.push('Date:'+date+' Hour: '+hour+'');
        videos.map((video)=>{
            links.push('<a href="/video?hour='+hour+'&date='+date+'&video='+video+'">'+video+'</a>');
        })
        links.push('<a href="/hours?date='+date+'">Up</a>');
        minutes.map((minute)=>{
            links.push('<a href="/pictures?hour='+hour+'&date='+date+'&minute='+minute+'">'+minute+'</a>');
        })
        res.send(links.join("<br>"));
    });
})

app.get('/pictures', function (req, res) {
    var hour = req.query.hour;
    var minute = req.query.minute;
    var date = req.query.date;
    var pathToPictures = pathToDates+'/'+date+pathToImgs+'/'+hour+'/'+minute;
    var pictures = [];
    c.list(pathToPictures, function(err, list) {
        if (err) throw err;
        list.map((item)=>{
            if(item.type!=='d'){pictures.push(item.name);};
        })
        var links = [];
        links.push('<div>Date:'+date+' Hour: '+hour+' Minute: '+minute+'</div>');
        links.push('<a href="/minutes?hour='+hour+'&date='+date+'">Up</a>');
        pictures.map((picture)=>{
            links.push('<a href="/showpic?hour='+hour+'&date='+date+'&minute='+minute+'&picture='+picture+'"><img height="300px" src="/showpic?hour='+hour+'&date='+date+'&minute='+minute+'&picture='+picture+'"/></a>');
        })
        res.send(links.join("<br>"));
    });
})

app.get('/showpic', function (req, res) {
    var hour = req.query.hour;
    var minute = req.query.minute;
    var date = req.query.date;
    var picture = req.query.picture;
    var pathToPicture = pathToDates+'/'+date+pathToImgs+'/'+hour+'/'+minute+'/'+picture;
    c.get(pathToPicture, function(err, stream) {
        if (err) throw err;
        stream.once('close', function() { console.log("Download from FTP finish.") });
        stream.pipe(res);
      });
})

app.get('/video', function (req, res) {
    var hour = req.query.hour;
    var date = req.query.date;
    var video = req.query.video;
    var pathToV = pathToDates+'/'+date+pathToVideos+'/'+hour+'/'+video;
    console.log(pathToV)
    c.get(pathToV, function(err, stream) {
        if (err) throw err;
        stream.once('close', function() { console.log("Download from FTP finish.") });
        // res.setHeader('Content-Disposition: attachment; filename="filename.dav"')
        res.set("Content-Disposition", "attachment; filename=\""+video+"\"");
        stream.pipe(res);
      });
})

app.listen(4000)

process.on('exit', (code) => {
    console.log(`About to exit with code: ${code}`);
    c.end();
  });

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");
    process.exit();
});