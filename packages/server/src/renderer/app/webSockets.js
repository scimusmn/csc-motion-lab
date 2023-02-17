function wsClient() {
  var _this = this;
  var ws = null;
  var connectInterval;

  this.onMessage = function(evt) {};

  this.send = function (message) {
    if(ws) ws.send(message);
  }

  this.connect = function() {
    var loc = window.location.host;//.substring(0, window.location.host.lastIndexOf(':'));
    if ('WebSocket' in window) ws = new WebSocket('ws://' + loc + ':8080/'); //ws://echo.websocket.org is the default testing server

    ws.onopen = function()
    {
      // Web Socket is connected, send data using send()
      ws.send('Message to send');
      clearInterval(connectInterval);
    };

    ws.onerror = function(error) {
      if ('WebSocket' in window) connectInterval = setInterval(this.connect(), 2000);
    };

    ws.onmessage = function(evt) {
      //var received_msg = evt.data;
      //alert("Message is received... " + received_msg);

      _this.onMessage(evt);
    };

    this.setMsgCallback = function(cb) {
      ws.onmessage = cb;
    };

    ws.onclose = function() {
      // websocket is closed.
      //alert("Connection is closed...");
      //connectInterval = setInterval(this.connect(), 2000);
      setInterval(()=>{
        ajax(window.location.href,(html)=>{
          location.reload();
        },()=>{
          console.log('server is down...');
        })
      }, 10000);
    };

  };

  //this.connect();

}



window.webSockClient = new wsClient();
