/* eslint-disable */

"use strict";

////////////////////////////////////////////////////////////////////////
// ######################## Require libraries ##########################
////////////////////////////////////////////////////////////////////////

// var vieworks = require('bindings')('vieworks');
// window.arduino = require('./arduino.js').arduino;
// var serial = require('./arduino.js').serial;
var cfg = require('./config.js').config;
var fs = require('fs');

var express = require('express');
var app = express();

// app.use(express.static('app'));
app.use(express.static(__dirname + '/app'));

app.listen(80, function(){
  console.log('listening on 80');
});

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 8080 });
var webSock = null;

wss.broadcast = function(data){
  console.log(":(((((( BROADCAST");
  wss.clients.forEach(function each(client) {
    client.send(data);
  });
}

////////////////////////////////////////////////////////////////////////
// ########################### Declarations ############################
////////////////////////////////////////////////////////////////////////

var timeoutFlag = true;
var blinkInt = null;
var blinkBool = 1;

var redInt = null;

let idleTO = null;
var dirNum = 0;

var goShown = false;
var audioPracticePlaying = false;

var goTimeout = null;

var waitForSave = false;
var cageOccupied = false;

var idle = ()=> {
  timeoutFlag = true;
  cageReset();
  if(waitForSave) location.reload();
  redEntranceLight(1);
  greenEntranceLight(0);
}

let resetIdleTimeout = () => {
  timeoutFlag = false;
  if (idleTO) clearTimeout(idleTO);
  idleTO = setTimeout(idle, 60000);
};

var output = document.querySelector('#output');

////////////////////////////////////////////////////////////////////////
// ################### Create camera and initialize ################# //
////////////////////////////////////////////////////////////////////////

// var cam = new vieworks.camera(function(){
//   cam.setFrameRate(200);
//   cam.setImageGain(24);

//   cam.allocateBuffer(1600);

//   var pre = document.querySelector('#predraw');
//   var can = document.querySelector('#display');

//   cam.startCapture(function(val){
//     cam.ready = true;
//     /*var ctx = can.getContext('2d');
//     var ptx = pre.getContext('2d');

//     var w = Math.ceil(cam.getWidth());
//     var h = Math.ceil(cam.getHeight());
//     console.log(w + ' is w and h is ' + h);
//     can.width = h;
//     can.height = w;

//     pre.width = w;
//     pre.height = h;

//     setInterval(()=>{
//       if(!cam.isCapturing()){
//         var t = cam.getImage(function(t){
//           if(t&&t.length>=w*h*3){
//             var im = ptx.createImageData(w,h);
//             var con = new Uint8ClampedArray(w*h*4);
//             for(let i=0,j=0; j< t.length; i+=4,j+=3){
//               con[i] = t[j+2];
//               con[i+1] = t[j+1];
//               con[i+2] = t[j];
//               con[i+3] = 255;
//             }
//             im.data.set(con);
//             ptx.fillStyle = 'black';
//             ptx.putImageData(im,0, 0);

//             ctx.save();
//             ctx.translate(can.width/2,can.height/2);
//             ctx.rotate(Math.PI/2);
//             ctx.drawImage(pre,-pre.width/2,-pre.height/2);
//             //ctx.drawImage(pre,-320,-240);
//             ctx.restore();
//           }
//         });
//       }
//     },50);*/
//   });

//   output.textContent = 'Ready to record';
// });

////////////////////////////////////////////////////////////////////////
// ########################### Audio files ############################
////////////////////////////////////////////////////////////////////////

let beep = document.querySelector('#beep');
beep.load();

let longBeep = document.querySelector('#longBeep');
longBeep.load();

let clickTrack = document.querySelector('#click');
clickTrack.load();

let getReady = document.querySelector('#getReady');
getReady.load();

getReady.volume = .75;

let exitTrack = document.querySelector('#exit');
exitTrack.load();

exitTrack.volume = .75;

let audio = [];

for (var i = 0; i < 4; i++) {
  audio.push(document.querySelector('#audio_' + (i)));
  audio[i].load();
}

////////////////////////////////////////////////////////////////////////
// ############### Practice Cage brightsign triggers ###################
////////////////////////////////////////////////////////////////////////

// window.loopPractice = () => {
//   arduino.digitalWrite(13, 0);
//   console.log('Loop practice');
//   setTimeout(() => {
//     arduino.digitalWrite(13, 1);
//   }, 100);
// };

window.showGo = () => {
  // arduino.digitalWrite(12, 0);
  console.log('Show go');
  goShown = true;
  // setTimeout(() => {
  //   arduino.digitalWrite(12, 1);
  //   setTimeout(() => {
  //     goShown = false;
  //     //loopPractice();
  //   }, 17000);
  // }, 100);
};

// window.showPracticeAudio = (fxn) => {
//   arduino.digitalWrite(13, 0);
//   console.log("practice audio");
//   audioPracticePlaying = true;
//   //resetIdleTimeout();
//   setTimeout(() => {
//     arduino.digitalWrite(13, 1);
//     goTimeout = setTimeout(() => {
//       audioPracticePlaying = false;
//       showGo();
//       if(fxn) fxn();
//     }, 25000);
//   }, 100);
// };

////////////////////////////////////////////////////////////////////////
// ###### Aliases for controlling the lights via arduino. ########### //
////////////////////////////////////////////////////////////////////////

// var greenExitLight = (state) => {
//   arduino.digitalWrite(3, state);
// };

// var redExitLight = (state) => {
//   arduino.digitalWrite(4, state);
// };

// var greenEntranceLight = (state) => {
//   arduino.digitalWrite(5, state);
// };

// var redEntranceLight = (state) => {
//   arduino.digitalWrite(6, state);
//   if (state) loopPractice();
// };

// var pollLight = new function(){
//   var cInt = null;

//   var pole = [7,8,9,10,15];
//   var cArr = [[0,1,1,1,1],
//               [0,0,1,1,1],
//               [0,0,0,1,1],
//               [0,0,0,0,1],
//               [0,0,0,0,0],
//               [0,0,0,0,0]
//             ];

//   var cCount = 0;

//   this.setGreen = function(){
//     for(let i=0; i<5; i++){
//       arduino.digitalWrite(pole[i], 0);
//     }
//     arduino.digitalWrite(8, 1);
//   };

//   this.setRed = function(){
//     for(let i=0; i<5; i++){
//       arduino.digitalWrite(pole[i],0);
//     }
//     arduino.digitalWrite(7, 1);
//   };

//   this.setStage = function(count){
//     for(let i=0; i<5; i++){
//       arduino.digitalWrite(pole[i], cArr[count][i]);
//     }
//   };

//   this.blink = function () {
//     cCount = 1;
//     cInt = setInterval(()=>{
//       for(let i=1; i<5; i++){
//         arduino.digitalWrite(pole[i], ((cCount)?1:0));
//       }
//       cCount=!cCount;
//     },250);
//   }

//   this.stopBlink = function () {
//     clearInterval(cInt);
//   }
// }

////////////////////////////////////////////////////////////////////////
// ######################## File manipulation ####################### //
////////////////////////////////////////////////////////////////////////

var deleteFolderRecursive = function(path) {
  if(path && fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

window.save = (dir,saveOther) => {
  console.log('saving to ' + dir, saveOther);
  if (fs.existsSync(dir)) deleteFolderRecursive(dir);
  fs.mkdirSync(dir);
  output.textContent = 'Saving...';
  
  // cam.save(dir, function() {
    output.textContent = 'Done Saving.';
    //force folder to update it's modification time.
    fs.utimesSync(dir, new Date(), new Date());
    //console.log('seq=' + dir.replace('./app/',''));

    // var files = readDir(__dirname + '/app/sequences/');
    
    var num = fs.readdirSync(__dirname + '/app/sequences/temp' + (3)).length;
    if (wss&&!saveOther) wss.broadcast('seq=' + dir.replace('./app/',''));
    console.log('saved to ' + dir);
    // cam.ready = true;
    waitForSave = false;
  // });
};

var countdown = (count) => {
  // pollLight.setStage(count);

  if (count > 0) {
    output.textContent = count;
    if(count<4){
      audio[count].currentTime = 0;
      audio[count].play();
    }
    setTimeout(() => { countdown(count - 1); }, 1000);
    if(count == 1 ) cam.capture();
    else if(count == 5) getReady.play();
  } else {
    output.textContent = 'Recording...';
    audio[count].currentTime = 0;
    audio[count].play();
    clickTrack.currentTime = 0;
    clickTrack.play();
    pollLight.blink();
    console.log('start capture');

    setTimeout(function() {
      exitTrack.play();
      output.textContent = 'Done Recording';
      cam.stopCapture();
      pollLight.stopBlink();
      pollLight.setRed();
      console.log('done capturing');
      var dir = './app/sequences/temp' + dirNum++;
      if(dirNum>=cfg.setsToStore) dirNum = 0;
      greenExitLight(1);
      blinkInt = setInterval(()=>{
        blinkBool = !blinkBool;
        greenExitLight((blinkBool)?1:0);
      },500)
      clearInterval(redInt);
      redExitLight(0);
      save(dir);
    }, cfg.recordTime);
  }
};

window.resetCam = function () {
  waitForSave = false;
}

window.startCntdn = function(pin, state) {
  // if ( !state && cam.ready && !waitForSave && !cageOccupied) {
    //timeoutFlag = false;
    resetIdleTimeout();
    clearTimeout(goTimeout);
    audioPracticePlaying = false;
    // clearInterval(blinkInt);
    waitForSave = true;
    cageOccupied = true;
    countdown(5);
    // greenExitLight(0);
    // clearInterval(redInt);
    // redExitLight(0);
    // greenEntranceLight( 0);
    // redEntranceLight( 1);
  // }

};

var startBut = document.querySelector('#start');
var saveBut = document.querySelector('#save');

saveBut.onclick = (e)=>{
  console.log("saveBut.onclick");
  save(document.querySelector('#folder').value,true);
}

startBut.onclick = ()=>{
  console.log("startBut.onclick");
  cageOccupied = false;
  window.startCntdn();
}

window.admitNext = ()=>{
  showGo();
  resetIdleTimeout();
  greenExitLight(0);
  clearInterval(redInt);
  redInt = setInterval(()=>{
    blinkBool = !blinkBool;
    redExitLight((blinkBool)?1:0);
  },500);
  clearInterval(blinkInt);
  greenEntranceLight( 1);
  redEntranceLight( 0);
}

var cageReset = ()=>{
  cageOccupied = false;
  greenExitLight(0);
  clearInterval(redInt);
  redInt = setInterval(()=>{
    blinkBool = !blinkBool;
    redExitLight((blinkBool)?1:0);
  },500);
  clearInterval(blinkInt);
}

/////////////////////////////////////////////////////////////////////////////
//####################### Arduino Declarartions #############################
/////////////////////////////////////////////////////////////////////////////

var ardTimeout = null;

// var resetArduinoHeartbeat = (time)=>{
//   if(ardTimeout) clearTimeout(ardTimeout);
//   ardTimeout = setTimeout(()=>{
//     console.log('Arduino not responsive, reloading.');
//     location.reload();
//   },time);
// }

// resetArduinoHeartbeat(60000);

var heartbeatInt = null;

// arduino.connect(cfg.portName, function() {
//   console.log('Connecting to Arduino');
//   //pollLight.setStage(4);

//   arduino.watchPin(2, window.startCntdn);

//   arduino.watchPin(14, function(pin, state) {
//     //console.log(state + " is the current state on "+ pin);
//     if (state) {
//       setTimeout(cageReset,1000);
//     }
//   });

//   arduino.watchPin(16, function(pin, state) {
//     if (!state) {
//       console.log('practice cage occupied');
//       if(!audioPracticePlaying){
//         if(timeoutFlag){
//           console.log('show practive with audio');
//           showPracticeAudio(admitNext);
//         } else if(!cageOccupied && !goShown){
//           admitNext();
//         }
//       }
//     }
//   });

//   arduino.analogReport(5,500,(pin,val)=>{
//     console.log('Heartbeat');
//     resetArduinoHeartbeat(10000);
//   });


//   /*heartbeatInt = setInterval(()=>{
//     console.log('Try to get heartbeat.');
//     arduino.analogRead(5);
//   },1000);*/

//   console.log('Connected to arduino');

//   /*greenExitLight(0);
//   //redExitLight(1);
//   clearInterval(redInt);
//   redInt = setInterval(()=>{
//     blinkBool = !blinkBool;
//     redExitLight((blinkBool)?1:0);
//   },500);
//   greenEntranceLight( 1);
//   redEntranceLight( 0);*/

//   idle();
// });

/////////////////////////////////////////////////////////////////////////////
//############################ File Handling ################################
/////////////////////////////////////////////////////////////////////////////

function readDir(path) {
  console.log("readDir PATH: " + path)
  var files = fs.readdirSync(path);

  files.sort(function(a, b) {
    return fs.statSync(path + a).atime.getTime() - fs.statSync(path + b).atime.getTime();
    // return fs.statSync('./' + path + a).atime.getTime() - fs.statSync('./' + path + b).atime.getTime();
  });

  for (var i = 0; i < files.length; i++) {
    files[i] = path + files[i];
  }

  return files;
}

//Tell the wsServer what to do on connnection to a client;
wss.on('connection', function(ws) {

  console.log("Websocket connection established");

  const VISITOR_DIR = '/app/sequences/';
  const CELEBRITY_DIR = '/app/celeb_seq/';

  var files = readDir(__dirname + VISITOR_DIR);
  var celFiles = readDir(__dirname + CELEBRITY_DIR);

  // var files = readDir('app/sequences/');
  // var celFiles = readDir('app/celeb_seq/');

  if (ws) {
    for (var i = 0; i < files.length; i++) {
      if (files[i].indexOf('.DS_Store') === -1) {
        var path = files[i].split('renderer/app')[1];
        console.log("send seq: " + path + "");
        ws.send('seq=' + path);
      }
    }

    for (var i = 0; i < celFiles.length; i++) {
      //var num = fs.readdirSync(celFiles[i]).length;
      // ws.send('cel=' + celFiles[i].substring(4));
      // ws.send('cel=' + celFiles[i]);

      if (celFiles[i].indexOf('.DS_Store') === -1) {
        // var path = celFiles[i].replace('/Users/tnordberg/Documents/SMM/Dev/stele/src/renderer/app','');
        var path = celFiles[i].split('renderer/app')[1];
        ws.send('cel=' + path);
      }

    }
  }

  ws.on('message', function(message) {
    console.log("On Websocket message:", message);
    switch (message.split('=')[0]){
      case 'del':
        console.log('deleting folder ' + message.split('=')[1]);
        deleteFolderRecursive('app/' + message.split('=')[1] + '/');
        wss.broadcast('reload');
        //
        break;
    }
  });

  ws.on('close', function() {
    console.log("Websocket closed");
    webSock = null;
  });

  ws.on('error', function(error) {
    webSock = null;
    console.log('Error: ' + error);
  });
});

/////////////////////////////////////////////////////////////////////////////
//############################ Keyboard input ###############################
/////////////////////////////////////////////////////////////////////////////

document.onkeypress = (e) => {
  var press = String.fromCharCode(e.keyCode);
  if(press == 'g') {
    showGo();
  } else if(press == 'c') startCntdn();
  else if(press == 'r'){
    if(wss) wss.broadcast('reload');
  }
}
