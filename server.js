const express = require('express')
const app = express()
app.use(express.static('public'));

var Client = require('ftp');

const pathToDates = "/cam/2F02CE5PAA00391";
const pathToImgs = "/001/jpg"
const pathToVideos = "/001/dav"
var dates = [];

//==============================================================================
const getPromise = function(func, args){
    return new Promise((done, fail)=>{
        func(done, fail, args);
    })
}

const getDates = (done, fail, {c})=>{
    var dates = [];
    c.list(pathToDates,function(err, list) {
        if (err) fail(err);
        list.map((item)=>{
            if(item.type==='d'){dates.push(item.name);};
        })
        done(dates);
    });
}

const getHours = (done, fail, {pathToHours, c})=>{
    var hours = [];
    c.list(pathToHours, function(err, list) {
        if (err) fail(err);
        list.map((item)=>{
            if(item.type==='d'){hours.push(item.name);};
        })
        done(hours);
    });
}

const getMinutes = (done, fail, {pathToMinutes, c})=>{
    var minutes = [];
    c.list(pathToMinutes, function(err, list) {
        if (err) fail(err);
        list.map((item)=>{
            if(item.type==='d'){minutes.push(item.name);};
        })
        done(minutes);
    });
}

const ftpReady = (done, fail, {c})=>{
    c.on('ready', function() {
        console.log("Ready")
        done();
    });
}

const getCats = async function(req, res){
    var glob = {}
    var c = new Client();
    c.connect({host:"smart-spb.ru",user:"test", password:"nwe97wzuUbTe!"});
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Start ${Math.round(used * 100) / 100} MB`);
    await getPromise(ftpReady, {c})
    var dates = await getPromise(getDates, {c});
    dates.forEach(async (date, di)=>{
        glob[date] = [];
        var pathToHours = pathToDates+'/'+date+pathToImgs;
        var hours = await getPromise(getHours, {pathToHours, c});
        hours.forEach(async (hour, hi)=>{
            var pathToMinutes = pathToDates+'/'+date+pathToImgs+'/'+hour;
            var minutes = await getPromise(getMinutes, {pathToMinutes, c});
            hour={[hour]:minutes};
            glob[date].push(hour);
            if(di+1==dates.length && hi+1==hours.length){
                res.send(glob);
                c.end();
                const used = process.memoryUsage().heapUsed / 1024 / 1024;
                console.log(`Start ${Math.round(used * 100) / 100} MB`);
            }
        })
    })
}

app.get('/cats', getCats);
//=============================================================================



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

app.get('/test', (req,res)=>{
    console.log("OK")
    res.send("OK")})

app.get('/minutes', async function (req, res) {
    var hour = req.query.hour;
    var date = req.query.date;
    var pathToMinutes = pathToDates+'/'+date+pathToImgs+'/'+hour;
    var minutes = [];
    var pathToV = pathToDates+'/'+date+pathToVideos+'/'+hour;
    var videos = [];
    var links = [];
    console.log("VIDEOS: ");
    await new Promise((resolve, reject)=>{
        c.list(pathToV, function(err, list){
            if (err) reject(err);
            list.map((item)=>{
                if(item.type!=='d' && item.name.indexOf(".dav")!==-1){videos.push(item.name);};
            })
            resolve();
        });
    });
    console.log("VIDEOS2: ");

    c.list(pathToMinutes, function(err, list) {
        if (err) throw err;
        list.map((item)=>{
            if(item.type==='d'){minutes.push(item.name);};
        })

        links.push('Date:'+date+' Hour: '+hour+'');
        videos.map((video)=>{
            links.push('<a href="/video?hour='+hour+'&date='+date+'&video='+video+'">'+video+'</a>');
        })
//=====!!!!!!!!!!!!!!!!!!!!!!!!!================
        links.push('<video src="/showvideo?date='+date+'&hour='+hour+'&video='+videos[0]+'" type="video/ogg></video>')
//=====!!!!!!!!!!!!!!!!!!!!!!!!!================
        minutes.map((minute)=>{
            links.push('<a href="/pictures?hour='+hour+'&date='+date+'&minute='+minute+'">'+minute+'</a>');
        })
        c.end();
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
            links.push('<a href="/showpic?hour='+hour+'&date='+date+'&minute='+minute+'&picture='+picture+'"><img height="300px" src="/showpicmin?hour='+hour+'&date='+date+'&minute='+minute+'&picture='+picture+'"/></a>');
        })
        res.send(links.join("<br>"));
    });
})

const sharp = require('sharp');

app.get('/showpic', function (req, res) {
    var hour = req.query.hour;
    var minute = req.query.minute;
    var date = req.query.date;
    var picture = req.query.picture;
    var pathToPicture = pathToDates+'/'+date+pathToImgs+'/'+hour+'/'+minute+'/'+picture;
    c.get(pathToPicture, function(err, stream) {
        if (err) throw err;
        stream.pipe(res);
        stream.on('close', function() { console.log("Download from FTP finish.") });
      });
})

var ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

app.get('/showvideo', function (req, res) {
    console.log("SHOWVIDEO")
    var hour = req.query.hour;
    var date = req.query.date;
    var video = req.query.video;
    var pathToV = pathToDates+'/'+date+pathToVideos+'/'+hour+'/'+video;

    var cl = new Client();
    cl.connect({host:"smart-spb.ru",user:"test", password:"nwe97wzuUbTe!"});

    cl.get(pathToV, function(err, stream) {
        if (err) throw err;
        ffmpeg(stream)
            .format('ogg')
            .on('start', function(cmd) {
                console.log('Started ' + cmd);
              })
              .on('error', function(err) {
                console.log('An error occurred: ' + err.message);
              })
            .on('end', function() {
                console.log('Finished processing');
              })
            .pipe(res, {end: true})
            // .writeToStream(res, {end:true})
            // .run();
        // stream.pipe(res);
        stream.on('close', function() { console.log("Download from FTP finish."); c.end();});
      });
})

app.get('/showpicmin', function (req, res) {
    var hour = req.query.hour;
    var minute = req.query.minute;
    var date = req.query.date;
    var picture = req.query.picture;
    var pathToPicture = pathToDates+'/'+date+pathToImgs+'/'+hour+'/'+minute+'/'+picture;
    let transform = sharp()
                    .resize({ width: 320, height: 240 })
                    .on('info', function(fileInfo) {
                        console.log("Resizing done, file not saved");
                    });
    c.get(pathToPicture, function(err, stream) {
        if (err) throw err;
        stream.pipe(transform).pipe(res);
        stream.on('close', function() { console.log("Download from FTP finish.") });
      });
})

app.get('/video', function (req, res) {
    var hour = req.query.hour;
    var date = req.query.date;
    var video = req.query.video;
    var pathToV = pathToDates+'/'+date+pathToVideos+'/'+hour+'/'+video;
    console.log("PATH TO V",pathToV)
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