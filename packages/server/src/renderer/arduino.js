/* eslint-disable */

"use strict";

// var com = require('serialport');
const SerialPort = require('serialport');
const Parser = require('./SmmParser.js');

console.log('SerialPort imported:');
console.dir(SerialPort);

var serial = function() {
  let bufSize = 512;

  let _this = this;
  let ser = null;
  _this.isOpen = false;
  _this.onConnect = () => {};

  _this.onMessage = () => {};

  _this.send = (arr) => {
    // arr.push(124);
      // if (_this.isOpen) ser.write(new Buffer(arr));
      
      if (_this.isOpen) {
          console.log('sending:', arr);
          ser.write(arr + '\n');
      } else {
          console.log("WHOOPS serial was closed");
      }
  };

  _this.open = (fxn) => {
    console.log('arduino.js - open:');
      SerialPort.list(function(err, ports) {
        console.log('arduino.js - open - finding Arduino...');
        var name = '';
        ports.forEach(function(port) {
          // Auto-detect via manufacturer name here instead of 
          // requiring specific port comName - tn, 2023
          /// e.g., manufacturer: "Arduino (www.arduino.cc)", 
          var man = port.manufacturer;
          if (man && man.toLowerCase().indexOf('arduino') > -1) {
            console.log("Arduino found!");
            console.log(port);
            name = port.comName;
            _this.openByName(name, fxn);
          }
        });
        if (name === '') {
          console.log('[WARNING] Arduino was not found on any of the following ports:');
          console.dir(ports);
        }
      });
  };

  _this.openByName = (portName, fxn) => {
    if (fxn) _this.onMessage = fxn;
    console.log('Opening serialport ' + portName);

    // Updated to work with latest serialport - tn, 2023
    ser = new SerialPort(portName, {
      baudRate: 115200,
    });

    _this.parser = ser.pipe(new Parser());

    ser.on('open', function() {
        _this.isOpen = true;
        console.log('serial successfully opened');
        _this.onConnect();
      _this.parser.on('data', function(data) {
        const { key, value } = data;
        console.log(data);
        if (key !== null) {
          _this.onMessage(key, value);
        }
      });

    });

    ser.on('error', function(err) {
      console.log('Error from SerialPort');
      console.log(err);
      sp = null;
    });
  };
};

exports.serial = new serial();
var sp = exports.serial;

////////////////////////////////////////////////////////

var Arduino = function() {
  this.ready = false;
  this.watchers = {};
  var _this = this;

  this.ws = null;

    this.onMessage = function (key, value) {
        if (key === 'go-high') {
        	this.watchers[value](value, true);
        } else if (key === 'go-low') {
        	this.watchers[value](value, false);
        }
    };

    this.configureDigitalOutput = function (pin) {
        const configureMsg = '{configure-output:' + pin + '}';
        console.log('configureMsg - ', configureMsg);
        sp.send(configureMsg);
    };

    this.configureInputPullup = function (pin) {
        const configureMsg = '{configure-pullup:' + pin + '}';
        sp.send(configureMsg);
    };

    this.configureInput = function (pin) {
        const configureMsg = '{configure-input:' + pin + '}';
        sp.send(configureMsg);
    };

  this.digitalWrite = function(pin, state) {
    // if (!_this.isOpen) return;
   // if (pin <= 15) sp.send([START + DIGI_WRITE + ((pin & 15) << 1) + (state & 1)]);
    //  else console.log('Pin must be less than or equal to 15');
      console.log('digitalWrite', pin, state);
      if (state === 0) {
          sp.send('{write-low:' + pin + '}');
      } else {
          sp.send('{write-high:' + pin + '}');
      }
     
  };

  this.digitalRead = function(pin) {
    if (!_this.isOpen) return;
    sp.send([START + DIGI_READ + (pin & 31)]);
  };

  this.analogWrite = function(pin, val) {
    if (!_this.isOpen) return;
    if (val >= 0 && val < 256)
      sp.send([START + ANA_WRITE + ((pin & 7) << 1) + (val >> 7), val & 127]);
  };

  this.watchPin = function(pin, handler) {
      console.log('set up watch on pin ' + pin);
      this.watchers[pin] = handler;
      sp.send('{watch-pin:' + pin + '}');
  };

  this.analogReport = function(pin, interval, handler) {
    interval /= 2;
    if (interval < 256) {
      sp.send([START + ANA_REPORT + ((pin & 7) << 1) + (interval >> 7), interval & 127]);
      this.anaHandlers[pin] = handler;
    } else console.log('interval must be less than 512');
    };

    

  this.setAnalogHandler = function(pin, handler) {
    this.anaHandlers[pin] = handler;
  };

  this.setHandler = function(pin, handler) {
    this.digiHandlers[pin] = handler;
  };

  this.analogRead = function(pin) {
    sp.send([START + ANA_READ + ((pin & 7) << 1)]);
  };

  this.stopReport = function(pin) {
    sp.send([START + ANA_REPORT + ((pin & 7) << 1), 0]);
  };

  this.wireSend = function(adr, dataArr) {
    dataArr.unshift(128, 192, adr);
    dataArr.push(192);
    dataArr.push(129);
    sp.send(dataArr);
  };

  this.onReady = function() {};

  this.serialOpenCB = function() {
    this.ready = true;
    this.onReady();
  };

  this.connect = function(fxn) {
    console.log("arduino.js connect");
    exports.serial.onConnect = fxn;
    exports.serial.open((k, v) => this.onMessage(k, v));
  };

  this.createdCallback = function() {
  };
};

exports.arduino = new Arduino();
