const express = require('express')
const app = express()
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
require('dotenv').config()

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", process.env.FRONT);
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", "Cache-Control, Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

const getPromise = function(func, args){
    return new Promise((done, fail)=>{
        func(done, fail, args);
    })
}

//======================================================================================

const rootPath = '/home/vftp'
const pathToDates = "/cam/2F02CE5PAA00391";
const pathToImgs = "/001/jpg"
const pathToVideos = "/001/dav"

app.get('/showvideostatic', function (req, res) {
    let {hour, date, video} = req.query;
    let pathToV = rootPath+'/'+pathToDates+'/'+date+pathToVideos+'/'+hour+'/'+video;
    res.setHeader('Content-Type', 'video/webm');
    let readStream = fs.createReadStream(pathToV);
    ffmpeg(readStream)
        .format('webm')
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
    readStream.on('close', function() { console.log("Download from Disk finish.");});
})

app.get('/showpicstatic', function (req, res) {
    let {hour, minute, date, picture} = req.query;
    let pathToPicture = rootPath+'/'+pathToDates+'/'+date+pathToImgs+'/'+hour+'/'+minute+'/'+picture;
    let readStream = fs.createReadStream(pathToPicture);
    let transform = sharp()
                    .resize({ width: 320, height: 240 })
                    .on('info', function(fileInfo) {
                        console.log("Resizing done, file not saved");
                    });

    readStream.pipe(transform).pipe(res);
    readStream.on('close', function() { console.log("Download from Disk finish.");});
})

//============================================================================
const fs = require('fs');

const readFolder = (done, fail, {folder, filetype=false})=>{
    fs.readdir(rootPath+folder, {withFileTypes: true}, (err, files) => {
        if(err){fail(err)};
        done(files.filter((file)=>filetype?!file.isDirectory():file.isDirectory()));
    });
}

app.get('/getcats', async (req, res)=>{
    let events = [];
    let dates = await getPromise(readFolder, {folder: pathToDates});
    for (let i=0; i<dates.length; i++){
        let {name:date} = dates[i];
        let hours = await getPromise(readFolder, {folder: pathToDates+'/'+date+pathToImgs});
        for (let i=0; i<hours.length; i++){
            let {name:hour} = hours[i];
            let minutes = await getPromise(readFolder, {folder: pathToDates+'/'+date+pathToImgs+'/'+hour});
            for (let i=0; i<minutes.length; i++){
                let {name: minute} = minutes[i];
                let videos = await getPromise(readFolder, {folder: pathToDates+'/'+date+pathToVideos+'/'+hour, filetype: true});
                let v = videos.filter((video)=>(video.name.indexOf(".dav")!==-1&&
                    ((video.name[3]==minute[0]&&video.name[4]==minute[1])||
                    (video.name[12]==minute[0]&&video.name[13]==minute[1])))).map(({name})=>name);
                let picsFull = await getPromise(readFolder, {folder: pathToDates+'/'+date+pathToImgs+'/'+hour+'/'+minute, filetype:true})
                let pics = [];
                picsFull.forEach(({name:pic})=>pics.push(pic));
                events.push({date, hour, minute, pics, videos: v});
            }
        }
    }
    res.send(events);
})

//==============================================================================

app.listen(4000)

process.on('exit', (code) => {
    console.log(`About to exit with code: ${code}`);
  });

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");
    process.exit();
});