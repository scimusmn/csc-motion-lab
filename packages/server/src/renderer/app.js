/* eslint-disable */

"use strict";

////////////////////////////////////////////////////////////////////////
// ######################## Require libraries ##########################
////////////////////////////////////////////////////////////////////////

window.arduino = require('./arduino.js').arduino;
var serial = require('./arduino.js').serial;
var cfg = require('./config.js').config;
var {
    PIN_BRIGHTSIGN_AUDIO,
    PIN_BRIGHTSIGN_PRACTICE,
    PIN_BRIGHTSIGN_GO,
    PIN_GREEN_EXIT_LIGHT,
    PIN_RED_EXIT_LIGHT,
    PIN_GREEN_PRACTICE_LIGHT,
    PIN_RED_PRACTICE_LIGHT,
    PINS_POLE_LIGHTS,
    PIN_POLE_LIGHT_GREEN,
    PIN_POLE_LIGHT_RED,
    PIN_START_COUNTDOWN_BTN,
    PIN_EXIT_CAGE_SENSOR,
    PIN_PRACTICE_CAGE_SENSOR
} = require('./pins.js')(arduino);
var fs = require('fs');

var express = require('express');
var app = express();

var { exec, execFile, spawn } = require('child_process');

var pathHelper = require('path');
var clientRoot = pathHelper.join(__dirname, '../../../client');

const VISITOR_DIR = '\\sequences\\';
const CELEBRITY_DIR = '\\celeb_seq\\';

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
  // if(waitForSave) location.reload();
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

var startCameraCapture = function(saveDir) {

  var executablePath = cfg.pathToCamera;
  var camGain = cfg.cameraGain.toString();

  console.log('startCameraCapture - executablePath: ' + executablePath);
  console.log('startCameraCapture - saveDir: ' + saveDir);

  const cameraProgram = execFile(executablePath, [camGain, saveDir], (error, stdout, stderr) => {
    if (error) {
      // Something went wrong
      console.log('ERROR:', error);
      throw error;
    } else {
      console.log('SUCCESS');
    }
    console.log('stdout:', stdout);
  });

  cameraProgram.on('close', (code) => {
    console.log('cameraProgram CLOSED with code ' + code);
    if (code === 0) {
      var savedDir = clientRoot + VISITOR_DIR + 'temp' + dirNum++ + '\\';
      broadcastSave(savedDir);
    } else {
      console.log('cameraProgram FAILED with code ' + code);
    }
  });

  cameraProgram.on('exit', (code) => {
    console.log('cameraProgram EXITED with code ' + code);
  });

};

////////////////////////////////////////////////////////////////////////
// ############### Practice Cage brightsign triggers ###################
////////////////////////////////////////////////////////////////////////

window.loopPractice = () => {
  arduino.digitalWrite(PIN_BRIGHTSIGN_PRACTICE, 0);
  console.log('Loop practice');
  setTimeout(() => {
    arduino.digitalWrite(PIN_BRIGHTSIGN_PRACTICE, 1);
  }, 100);
};

window.showGo = () => {
  arduino.digitalWrite(PIN_BRIGHTSIGN_GO, 0);
  console.log('Show go');
  goShown = true;
  setTimeout(() => {
    arduino.digitalWrite(PIN_BRIGHTSIGN_GO, 1);
    setTimeout(() => {
      goShown = false;
    }, 17000);
  }, 100);
};

window.showPracticeAudio = (fxn) => {
  arduino.digitalWrite(PIN_BRIGHTSIGN_PRACTICE, 0);
  console.log("practice audio");
  audioPracticePlaying = true;
  //resetIdleTimeout();
  setTimeout(() => {
    arduino.digitalWrite(PIN_BRIGHTSIGN_PRACTICE, 1);
    goTimeout = setTimeout(() => {
      audioPracticePlaying = false;
      showGo();
      if(fxn) fxn();
    }, 25000);
  }, 100);
};

////////////////////////////////////////////////////////////////////////
// ###### Aliases for controlling the lights via arduino. ########### /
////////////////////////////////////////////////////////////////////////

var greenExitLight = (state) => {
  arduino.digitalWrite(PIN_GREEN_EXIT_LIGHT, state);
};

var redExitLight = (state) => {
  arduino.digitalWrite(PIN_RED_EXIT_LIGHT, state);
};

var greenEntranceLight = (state) => {
  arduino.digitalWrite(PIN_GREEN_PRACTICE_LIGHT, state);
};

var redEntranceLight = (state) => {
  arduino.digitalWrite(PIN_RED_PRACTICE_LIGHT, state);
  if (state) loopPractice();
};

var pollLight = new function(){
  var cInt = null;

  var cArr = [[0,1,1,1,1],
              [0,0,1,1,1],
              [0,0,0,1,1],
              [0,0,0,0,1],
              [0,0,0,0,0],
              [0,0,0,0,0]
            ];

  var cCount = 0;

  this.setGreen = function(){
    for(let i=0; i<PINS_POLE_LIGHTS.length; i++){
      arduino.digitalWrite(PIN_POLE_LIGHTS[i], 0);
    }
    arduino.digitalWrite(PIN_POLE_LIGHT_GREEN, 1);
  };

  this.setRed = function(){
    for(let i=0; i<PINS_POLE_LIGHTS.length; i++){
      arduino.digitalWrite(PINS_POLE_LIGHTS[i],0);
    }
    arduino.digitalWrite(PIN_POLE_LIGHT_RED, 1);
  };

  this.setStage = function(count){
    for(let i=0; i<PINS_POLE_LIGHTS.length; i++){
      arduino.digitalWrite(PINS_POLE_LIGHTS[i], cArr[count][i]);
    }
  };

  this.blink = function () {
    cCount = 1;
    cInt = setInterval(()=>{
      for(let i=1; i<PINS_POLE_LIGHTS.length; i++){
        arduino.digitalWrite(PINS_POLE_LIGHTS[i], ((cCount)?1:0));
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

var broadcastSave = (dir, saveOther) => {
  console.log('window.save saving to ' + dir, saveOther);

  if(dirNum>=cfg.setsToStore) dirNum = 0;

  output.textContent = 'Saving...';

  console.log("Images should be saved by now. Sending out broadcast to clients...");
  output.textContent = 'Done Saving.';

  //force folder to update it's modification time.
  fs.utimesSync(dir, new Date(), new Date());

  const seqPath = dir.split('\\client')[1];
  console.log('seqPath: ' + seqPath);
  if (wss&&!saveOther) wss.broadcast('seq=' + seqPath);
  console.log('saved to ' + dir);
  waitForSave = false;
    
};

// window.save = (dir, saveOther) => {
//   console.log('window.save saving to ' + dir, saveOther);

//   output.textContent = 'Saving...';
  
//   setTimeout(() => {
//     broadcastSave();
//   }, cfg.fileSaveDelay);
// };

var startCageSoundSequence = () => {
  console.log('Start cage audio sequence');
  arduino.digitalWrite(PIN_BRIGHTSIGN_AUDIO, 0);
  setTimeout(() => {
    arduino.digitalWrite(PIN_BRIGHTSIGN_AUDIO, 1);
  }, 100);
}

var countdown = (count) => {
  pollLight.setStage(count);

  var dir = '';

  if (count > 0) {
    output.textContent = count;
    setTimeout(() => { countdown(count - 1); }, 1000);
    
    if(count == 1 ) {
      dir = clientRoot + VISITOR_DIR + 'temp' + dirNum + '\\';
        console.log('Will save sequence to ' + dir);
        if (fs.existsSync(dir)) deleteFolderRecursive(dir);
        fs.mkdirSync(dir);
        console.log('Folder is empty: ' + dir);
      startCameraCapture(dir);
    }
    else if(count == 5) startCageSoundSequence(); 
  } else {
    output.textContent = 'Recording...';
    pollLight.blink();
    console.log('start capture');

    setTimeout(function() {
      output.textContent = 'Done Recording';
      pollLight.stopBlink();
      pollLight.setRed();
      
      greenExitLight(1);
      blinkInt = setInterval(()=>{
        blinkBool = !blinkBool;
        greenExitLight((blinkBool)?1:0);
      },500)
      clearInterval(redInt);
      redExitLight(0);
        
    }, cfg.recordTime);
  }
};

window.resetCam = function () {
  waitForSave = false;
}

window.startCntdn = function(pin, state) {
  if ( !state && !waitForSave && !cageOccupied) {
    console.log('Starting countdown');
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
  broadcastSave(document.querySelector('#folder').value,true);
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
//####################### Arduino Declarations #############################
/////////////////////////////////////////////////////////////////////////////

var ardTimeout = null;

var resetArduinoHeartbeat = (time)=>{
//  if(ardTimeout) clearTimeout(ardTimeout);
//  ardTimeout = setTimeout(()=>{
//    console.log('Arduino not responsive, reloading.');
//    location.reload();
//  },time);
}

resetArduinoHeartbeat(60000);

var heartbeatInt = null;

console.log('ATTEMPTING CONNECT');
arduino.connect(function() {
    console.log('app.js - Connecting to Arduino...');

    setTimeout(() => {

  // original code resumes
  arduino.watchPin(PIN_START_COUNTDOWN_BTN, window.startCntdn);

  arduino.watchPin(PIN_EXIT_CAGE_SENSOR, function(pin, state) {
    //console.log(state + " is the current state on "+ pin);
    if (state) {
      console.log('[PIN_EXIT_CAGE_SENSOR] pin', PIN_EXIT_CAGE_SENSOR, 'is high. Resetting cage.');
      setTimeout(cageReset,1000);
    }
  });

  arduino.watchPin(PIN_PRACTICE_CAGE_SENSOR, function(pin, state) {
    if (state) {
      console.log('practice cage occupied');
      if(!audioPracticePlaying){
        if(timeoutFlag){
          console.log('show practice with audio');
          showPracticeAudio(admitNext);
        } else if(!cageOccupied && !goShown){
          admitNext();
        }
      }
    }
    
  });

//  arduino.analogReport(PIN_GREEN_PRACTICE_LIGHT,500,(pin,val)=>{
//    console.log('Heartbeat');
//    resetArduinoHeartbeat(10000);
//  });
//

  console.log('Connected to arduino');


    idle();


    }, 2000);
  
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

  var splitKey = 'client';

  if (ws) {
    for (var i = 0; i < files.length; i++) {
      if (files[i].indexOf('.DS_Store') === -1) {
        var path = files[i].split(splitKey)[1];
        // console.log("send seq: " + path + "");
        ws.send('seq=' + path);
      }
    }

    for (var i = 0; i < celFiles.length; i++) {
      if (celFiles[i].indexOf('.DS_Store') === -1) {
        var path = celFiles[i].split(splitKey)[1];
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
        var delPath = clientRoot + message.split('=')[1] + '\\';
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
