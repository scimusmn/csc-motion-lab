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

var { exec, execFile } = require('child_process');

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

  console.log('startCameraCapture - executablePath: ' + executablePath);
  console.log('startCameraCapture - saveDir: ' + saveDir);

  const cameraProgram = execFile(executablePath, [saveDir], (error, stdout, stderr) => {
    if (error) {
      // Something went wrong
      console.log('ERROR:', error);
      throw error;
    } else {
      console.log('SUCCESS');
    }
    console.log('stdout:', stdout);
  });

  cameraProgram.on('exit', (code) => {
    console.log('cameraProgram EXITED with code ' + code);
    if (code === 0) {
      console.log('Yay! Caught successful exit code.');
      // TODO: notify client computers of new sequence and images
      // TODO: remove preset timer and use a callback instead
    }
  });

  cameraProgram.on('close', (code) => {
    console.log('cameraProgram CLOSED with code ' + code);
  });



  // exec(cmd, (error, stdout, stderr) => {
  //   if (error) {
  //       console.log(`error: ${error.message}`);
  //       return;
  //   }
  //   if (stderr) {
  //       console.log(`stderr: ${stderr}`);
  //       return;
  //   }
  //   console.log(`success - stdout: ${stdout}`);
  // });
};

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

// TODO: Clarify the difference between these two pins.
// Does one control the BrightSign video (13) and the other control the practice cage light (12)?
const PIN_BRIGHTSIGN_PRACTICE = 21;
const PIN_BRIGHTSIGN_GO = 20;  

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
      //loopPractice();
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

const PIN_GREEN_EXIT_LIGHT = 3; // Also connected to bottom of start wedge
const PIN_RED_EXIT_LIGHT = 4; // Also connected to top of start wedge

const PIN_GREEN_PRACTICE_LIGHT = 5; // Also connected to cage entrance green light
const PIN_RED_PRACTICE_LIGHT = 6; // Also connected to cage entrance red light

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

// 7 is first amber light (top of pole)
// 8 is second amber
// 9 is third amber
//const PINS_POLL_LIGHTS = [7,8,9,10,11];
const PINS_POLL_LIGHTS = [11,10,9,8,7];
const PIN_POLL_LIGHT_GREEN = 7;
const PIN_POLL_LIGHT_RED = 11;

var pollLight = new function(){
  var cInt = null;

  // var pole = [7,8,9,10,15];
  var cArr = [[0,1,1,1,1],
              [0,0,1,1,1],
              [0,0,0,1,1],
              [0,0,0,0,1],
              [0,0,0,0,0],
              [0,0,0,0,0]
            ];

  var cCount = 0;

  this.setGreen = function(){
    for(let i=0; i<PINS_POLL_LIGHTS.length; i++){
      arduino.digitalWrite(PIN_POLL_LIGHTS[i], 0);
    }
    arduino.digitalWrite(PIN_POLL_LIGHT_GREEN, 1);
  };

  this.setRed = function(){
    for(let i=0; i<PINS_POLL_LIGHTS.length; i++){
      arduino.digitalWrite(PINS_POLL_LIGHTS[i],0);
    }
    arduino.digitalWrite(PIN_POLL_LIGHT_RED, 1);
  };

  this.setStage = function(count){
    for(let i=0; i<PINS_POLL_LIGHTS.length; i++){
      arduino.digitalWrite(PINS_POLL_LIGHTS[i], cArr[count][i]);
    }
  };

  this.blink = function () {
    cCount = 1;
    cInt = setInterval(()=>{
      for(let i=1; i<PINS_POLL_LIGHTS.length; i++){
        arduino.digitalWrite(PINS_POLL_LIGHTS[i], ((cCount)?1:0));
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
  // if (fs.existsSync(dir)) deleteFolderRecursive(dir);
  // fs.mkdirSync(dir);
  // console.log('Folder is empty: ' + dir);

  output.textContent = 'Saving...';
  
  setTimeout(() => {
    console.log("Images should be saved by now. Sending out broadcast to clients...");
    output.textContent = 'Done Saving.';

    //force folder to update it's modification time.
    fs.utimesSync(dir, new Date(), new Date());

    const seqPath = dir.split('\\client')[1];
    console.log('seqPath: ' + seqPath);
    if (wss&&!saveOther) wss.broadcast('seq=' + seqPath);
    console.log('saved to ' + dir);
    waitForSave = false;
    
  }, cfg.fileSaveDelay);
};

var countdown = (count) => {
  pollLight.setStage(count);

  var dir = '';

  if (count > 0) {
    output.textContent = count;
    if(count<4){
      audio[count].currentTime = 0;
      audio[count].play();
    }
    setTimeout(() => { countdown(count - 1); }, 1000);
    
    if(count == 1 ) {
      dir = clientRoot + VISITOR_DIR + 'temp' + dirNum + '\\';
        console.log('Will save sequence to ' + dir);
        if (fs.existsSync(dir)) deleteFolderRecursive(dir);
        fs.mkdirSync(dir);
        console.log('Folder is empty: ' + dir);
      startCameraCapture(dir);
    }
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
      // var dir = clientRoot + VISITOR_DIR + 'temp' + dirNum++;
      var savedDir = clientRoot + VISITOR_DIR + 'temp' + dirNum++ + '\\';
      console.log('visitor save dir: ' + dir);
      if(dirNum>=cfg.setsToStore) dirNum = 0;
      greenExitLight(1);
      blinkInt = setInterval(()=>{
        blinkBool = !blinkBool;
        greenExitLight((blinkBool)?1:0);
      },500)
      clearInterval(redInt);
        redExitLight(0);
        
      save(savedDir);
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
//####################### Arduino Declarations #############################
/////////////////////////////////////////////////////////////////////////////

var ardTimeout = null;

const PIN_START_COUNTDOWN_BTN = 2;
const PIN_EXIT_CAGE_SENSOR = 23;
const PIN_PRACTICE_CAGE_SENSOR = 12;

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
//        console.log('light test configure');
//        arduino.configureDigitalOutput(PIN_GREEN_EXIT_LIGHT);
//        arduino.configureDigitalOutput(PIN_POLL_LIGHT_RED);
//        arduino.configureInputPullup(PIN_START_COUNTDOWN_BTN);
//        arduino.watchPin(PIN_START_COUNTDOWN_BTN, (pin, state) => {
//        	console.log('watch on start button', state);
//        });
//
//        setTimeout(() => {
//            console.log('light test on');
//            arduino.digitalWrite(PIN_GREEN_EXIT_LIGHT, 1);
//            arduino.digitalWrite(PIN_POLL_LIGHT_RED, 1);
//
//            setTimeout(() => {
//                console.log('light test off');
//                arduino.digitalWrite(PIN_GREEN_EXIT_LIGHT, 0);
//                arduino.digitalWrite(PIN_POLL_LIGHT_RED, 0);
//            }, 5000);
//        }, 5000);


  // configure pins
  arduino.configureDigitalOutput(PIN_BRIGHTSIGN_PRACTICE);
  arduino.configureDigitalOutput(PIN_BRIGHTSIGN_GO);

  arduino.configureDigitalOutput(PIN_GREEN_EXIT_LIGHT);
  arduino.configureDigitalOutput(PIN_RED_EXIT_LIGHT);
  arduino.configureDigitalOutput(PIN_GREEN_PRACTICE_LIGHT);
  arduino.configureDigitalOutput(PIN_RED_PRACTICE_LIGHT);

  for (let pin of PINS_POLL_LIGHTS) {
    arduino.configureDigitalOutput(pin);
  }
  arduino.configureDigitalOutput(PIN_POLL_LIGHT_GREEN);
  arduino.configureDigitalOutput(PIN_POLL_LIGHT_RED);

  arduino.configureInputPullup(PIN_START_COUNTDOWN_BTN);
  arduino.configureInputPullup(PIN_EXIT_CAGE_SENSOR);
  arduino.configureInputPullup(PIN_PRACTICE_CAGE_SENSOR);

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
    if (!state) {
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
