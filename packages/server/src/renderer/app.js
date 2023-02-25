/* eslint-disable */

"use strict";

////////////////////////////////////////////////////////////////////////
// ######################## Require libraries ##########################
////////////////////////////////////////////////////////////////////////

window.arduino = require('./arduino.js').arduino;
var serial = require('./arduino.js').serial;
var cfg = require('./config.js').config;
var fs = require('fs');

var express = require('express');
var app = express();

var { exec, execSync } = require('child_process');

var pathHelper = require('path');
var clientRoot = pathHelper.join(__dirname, '../../../client');

const VISITOR_DIR = '/sequences/';
const CELEBRITY_DIR = '/celeb_seq/';

console.log('clientRoot', clientRoot);
app.use(express.static(clientRoot));

app.listen(80, function(){
  console.log('listening on 80');
});

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 8080 });
var webSock = null;

wss.broadcast = function(data){
  console.log("Websocket broadcast");
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
  console.log('idle', waitForSave);
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

var startCameraCapture = function(path) {

  // var cmd = '../camera/camera.bat ' + path;
  var cmd = 'bash ../camera/temp.sh ';
  // TODO: refactor to use: cfg.pathToCamera

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`success - stdout: ${stdout}`);
  });
};

/* Note - this is where the original camera codes existed. 
It has been removed in favor of triggereing a batch file 
that runs the camera code. (see function above) - tn, 2023 */

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

window.loopPractice = () => {
  arduino.digitalWrite(13, 0);
  console.log('Loop practice');
  setTimeout(() => {
    arduino.digitalWrite(13, 1);
  }, 100);
};

window.showGo = () => {
  arduino.digitalWrite(12, 0);
  console.log('Show go');
  goShown = true;
  setTimeout(() => {
    arduino.digitalWrite(12, 1);
    setTimeout(() => {
      goShown = false;
      //loopPractice();
    }, 17000);
  }, 100);
};

window.showPracticeAudio = (fxn) => {
  arduino.digitalWrite(13, 0);
  console.log("practice audio");
  audioPracticePlaying = true;
  //resetIdleTimeout();
  setTimeout(() => {
    arduino.digitalWrite(13, 1);
    goTimeout = setTimeout(() => {
      audioPracticePlaying = false;
      showGo();
      if(fxn) fxn();
    }, 25000);
  }, 100);
};

////////////////////////////////////////////////////////////////////////
// ###### Aliases for controlling the lights via arduino. ########### //
////////////////////////////////////////////////////////////////////////

var greenExitLight = (state) => {
  arduino.digitalWrite(3, state);
};

var redExitLight = (state) => {
  arduino.digitalWrite(4, state);
};

var greenEntranceLight = (state) => {
  arduino.digitalWrite(5, state);
};

var redEntranceLight = (state) => {
  arduino.digitalWrite(6, state);
  if (state) loopPractice();
};

var pollLight = new function(){
  var cInt = null;

  var pole = [7,8,9,10,15];
  var cArr = [[0,1,1,1,1],
              [0,0,1,1,1],
              [0,0,0,1,1],
              [0,0,0,0,1],
              [0,0,0,0,0],
              [0,0,0,0,0]
            ];

  var cCount = 0;

  this.setGreen = function(){
    for(let i=0; i<5; i++){
      arduino.digitalWrite(pole[i], 0);
    }
    arduino.digitalWrite(8, 1);
  };

  this.setRed = function(){
    for(let i=0; i<5; i++){
      arduino.digitalWrite(pole[i],0);
    }
    arduino.digitalWrite(7, 1);
  };

  this.setStage = function(count){
    for(let i=0; i<5; i++){
      arduino.digitalWrite(pole[i], cArr[count][i]);
    }
  };

  this.blink = function () {
    cCount = 1;
    cInt = setInterval(()=>{
      for(let i=1; i<5; i++){
        arduino.digitalWrite(pole[i], ((cCount)?1:0));
      }
      cCount=!cCount;
    },250);
  }

  this.stopBlink = function () {
    clearInterval(cInt);
  }
}

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

window.save = (dir, saveOther) => {
  console.log('window.save saving to ' + dir, saveOther);

  // We delete the folder here, and recreate it as an empty folder.
  // The camera script will not work unless the folder is already empty.
  if (fs.existsSync(dir)) deleteFolderRecursive(dir);
  fs.mkdirSync(dir);
  console.log('Folder is empty: ' + dir);

  output.textContent = 'Saving...';
  
  setTimeout(() => {
    console.log("Images should be saved by now. Sending out broadcast to clients...");
    output.textContent = 'Done Saving.';

    //force folder to update it's modification time.
    fs.utimesSync(dir, new Date(), new Date());

    const seqPath = dir.split('/client')[1];
    console.log('seqPath: ' + seqPath);
    if (wss&&!saveOther) wss.broadcast('seq=' + seqPath);
    console.log('saved to ' + dir);
    waitForSave = false;
    
  }, cfg.fileSaveDelay);
};

var countdown = (count) => {
  pollLight.setStage(count);

  if (count > 0) {
    output.textContent = count;
    if(count<4){
      audio[count].currentTime = 0;
      audio[count].play();
    }
    setTimeout(() => { countdown(count - 1); }, 1000);
    if(count == 1 ) startCameraCapture('test directory');
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
      pollLight.stopBlink();
      pollLight.setRed();
      console.log('done capturing');
      // var dir = './app/sequences/temp' + dirNum++;
      var dir = clientRoot + VISITOR_DIR + 'temp' + dirNum++;
      console.log('visitor save dir: ' + dir);
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
  if ( !state && !waitForSave && !cageOccupied) {
    console.log('Starting countdown');
    //timeoutFlag = false;
    resetIdleTimeout();
    clearTimeout(goTimeout);
    audioPracticePlaying = false;
    clearInterval(blinkInt);
    waitForSave = true;
    cageOccupied = true;
    countdown(5);
    greenExitLight(0);
    clearInterval(redInt);
    redExitLight(0);
    greenEntranceLight( 0);
    redEntranceLight( 1);
  }

};

var startBut = document.querySelector('#start');
var saveBut = document.querySelector('#save');

saveBut.onclick = (e)=>{
  console.log("saveBut.onclick");
  // startCameraCapture("my/directory/here/"); // temp
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

var resetArduinoHeartbeat = (time)=>{
  if(ardTimeout) clearTimeout(ardTimeout);
  ardTimeout = setTimeout(()=>{
    console.log('Arduino not responsive, reloading.');
    location.reload();
  },time);
}

resetArduinoHeartbeat(60000);

var heartbeatInt = null;

arduino.connect(cfg.portName, function() {
  console.log('app.js - Connecting to Arduino...');
  //pollLight.setStage(4);

  arduino.watchPin(2, window.startCntdn);

  arduino.watchPin(14, function(pin, state) {
    //console.log(state + " is the current state on "+ pin);
    if (state) {
      setTimeout(cageReset,1000);
    }
  });

  arduino.watchPin(16, function(pin, state) {
    if (!state) {
      console.log('practice cage occupied');
      if(!audioPracticePlaying){
        if(timeoutFlag){
          console.log('show practive with audio');
          showPracticeAudio(admitNext);
        } else if(!cageOccupied && !goShown){
          admitNext();
        }
      }
    }
  });

  arduino.analogReport(5,500,(pin,val)=>{
    console.log('Heartbeat');
    resetArduinoHeartbeat(10000);
  });


  /*heartbeatInt = setInterval(()=>{
    console.log('Try to get heartbeat.');
    arduino.analogRead(5);
  },1000);*/

  console.log('Connected to arduino');

  /*greenExitLight(0);
  //redExitLight(1);
  clearInterval(redInt);
  redInt = setInterval(()=>{
    blinkBool = !blinkBool;
    redExitLight((blinkBool)?1:0);
  },500);
  greenEntranceLight( 1);
  redEntranceLight( 0);*/

  idle();
});

/////////////////////////////////////////////////////////////////////////////
//############################ File Handling ################################
/////////////////////////////////////////////////////////////////////////////

function readDir(path) {
  console.log("readDir PATH: " + path)
  var files = fs.readdirSync(path);

  files.sort(function(a, b) {
    return fs.statSync(path + a).atime.getTime() - fs.statSync(path + b).atime.getTime();
  });

  for (var i = 0; i < files.length; i++) {
    files[i] = path + files[i];
  }

  return files;
}

//Tell the wsServer what to do on connnection to a client;

wss.on('connection', function(ws) {

  console.log("Websocket connection established");

  var files = readDir(clientRoot + VISITOR_DIR);
  var celFiles = readDir(clientRoot + CELEBRITY_DIR);

  if (ws) {
    for (var i = 0; i < files.length; i++) {
      if (files[i].indexOf('.DS_Store') === -1) {
        var path = files[i].split('/client')[1];
        // console.log("send seq: " + path + "");
        ws.send('seq=' + path);
      }
    }

    for (var i = 0; i < celFiles.length; i++) {
      if (celFiles[i].indexOf('.DS_Store') === -1) {
        var path = celFiles[i].split('/client')[1];
        // console.log("send cel: " + path + "");
        ws.send('cel=' + path);
      }

    }
  }

  ws.on('message', function(message) {
    console.log("On Websocket message:", message);
    switch (message.split('=')[0]){
      case 'del':
        console.log('deleting folder ' + message.split('=')[1]);
        // incoming path example: '/sequences/temp15'
        // TODO: Need to check that pathing still works when coming from client
        // var files = readDir(clientRoot + VISITOR_DIR);
        var delPath = clientRoot + message.split('=')[1] + '/';
        console.log('delPath: ' + delPath);
        deleteFolderRecursive(delPath);
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
