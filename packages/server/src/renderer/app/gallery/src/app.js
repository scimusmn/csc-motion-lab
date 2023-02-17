'use strict';

let incs = [
  'webSockets.js',
];

include(incs, () => {
  console.log('loaded!');

  window.onload = function() {
  };



  window.webSockClient.onMessage = (evt) => {
    switch (evt.data.split('=')[0]){
      case 'seq':
        //visGroup.handleSet(evt.data.split('=')[1],parseInt(evt.data.split(':')[2]));
        var body = µ('body')[0];
        body.removeChild(body.firstElementChild);
        var gal = µ('+div',body);
        for(let i=0; i<600; i++){
          let temp = µ('+img',gal);
          temp.src = '../'+evt.data.split('=')[1]+'/'+zeroPad(i,3)+".jpg";
        }
        break;
      case 'cel':

        //celebGroup.handleSet(evt.data.split('=')[1],parseInt(evt.data.split(':')[2]));
        break;
      default:
        break;
    }
  };

  webSockClient.connect();

});
