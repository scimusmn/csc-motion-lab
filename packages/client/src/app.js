 'use strict';

console.log('app');

let incs = [
  'thumbnails.js',
  'webSockets.js',
  'videoPlayer.js',
  'button.js',
  'config.js',
];

include(incs, () => {
  console.log('loaded!');

  window.onload = function() {
    console.log('window onload');
  };

  var visGroup = µ('#thumbs');

  var celebGroup = µ('#celebThumbs');

  //sets the class of the body, to make the just you screen visible
  visGroup.onChoose = (set)=> {
    µ('body')[0].className = 'JustYou';

    //if we're in admin mode, send a delete request of the selected set,
    // which forces a reload on all of the playback stations
    if (visGroup.adminMode) window.webSockClient.send('del=' + set.setName);
  };

  //function to get the index in the parent element of a child
  var elementIndex = function(child) {
    if (child.previousSibling == null) return 1;
    else return elementIndex(child.previousSibling) + 1;
  };

  //create a blank string to hold the indices of the pressed child elements
  celebGroup.code = '';

  //when a celeb set is selected, store the index in the code variable
  celebGroup.onChoose = (set)=> {
    celebGroup.code += elementIndex(set);
  };

  //when we receive a message from the server
  window.webSockClient.onMessage = (evt) => {
    console.log('onMessage:', evt.data);
    switch (evt.data.split('=')[0]){
      //if it's calling out the address of a folder, handle it with the proper group
      case 'seq':
        // console.log("on seq", evt.data.split('=')[1], parseInt(evt.data.split(':')[2]));
        visGroup.handleSet(evt.data.split('=')[1], parseInt(evt.data.split(':')[2]));
        break;
      case 'cel':
        // console.log("on cel", evt.data.split('=')[1], parseInt(evt.data.split(':')[2]));
        celebGroup.handleSet(evt.data.split('=')[1], parseInt(evt.data.split(':')[2]));
        break;

      //if it's a reload command, refresh the page.
      case 'reload':
        location.reload();
      default:
        break;
    }
  };

  console.log("connecting ws");
  webSockClient.connect();

  //set the flag to store the images for the celeb player
  µ('#celebPlayer').player.cached = true;

  //once the video loads in either the celeb or visitor players, play it.
  µ('#visitorPlayer').onLoad = () => {
    µ('#visitorPlayer').play();
  };

  µ('#celebPlayer').onLoad = () => {
    µ('#celebPlayer').play();
  };

  //when the play state of the videos changes, set the state of the playboth button accordingly.
  µ('#celebPlayer').player.onStateChange = ()=> {
    let celebState = µ('#celebPlayer').player.playing;
    let visitorState = µ('#visitorPlayer').player.playing;

    if (celebState || visitorState) {
      µ('#playBoth').reset();
    } else if (!celebState && !visitorState) {
      µ('#playBoth').set();
    }
  };

  //make the state change callback the same for the visitor player and celeb player
  µ('#visitorPlayer').player.onStateChange = µ('#celebPlayer').player.onStateChange;

  /////////////////////////////
  // mode selectors
  /////////////////////////////

  function showJY() {
    //set the body class to JustYou, and clear the admin mode flag.
    µ('body')[0].className = 'JustYou';
    visGroup.adminMode = false;
    µ('#celebPlayer').unload();
  }

  function showSBS() {
    //set the body class to SideBySide, and clear the admin mode flag.
    µ('body')[0].className = 'SideBySide';
    visGroup.adminMode = false;
  }

  function showSelect() {
    //clear the idle timeout and deselect any selected thumbnails.
    if (resetTimer) clearTimeout(resetTimer);
    visGroup.resetActive();
    celebGroup.resetActive();

    //unload any loaded videos and set the className to findYourVideo
    µ('#visitorPlayer').unload();
    µ('#celebPlayer').unload();
    µ('body')[0].className = 'findYourVideo';
  }

  //////////////////////////////
  // ui functions
  /////////////////////////////

  µ('#jy').onclick = showJY;

  µ('#sbs').onclick = showSBS;

  µ('#fyv').onclick = function() {
    //show the visitor thumbnail select screen
    showSelect();

    //if the celeb thumbnails were selected in the correct order
    // before touching the 'find your video' button, enter admin mode.
    if (celebGroup.code == '31415') {
      visGroup.adminMode = true;
      µ('body')[0].className += ' AdminMode';
    }

    //clear the code which stores the order that the celeb thumbs were pressed.
    celebGroup.code = '';
  };

  //leave admin mode when the 'exit admin mode button is pressed.'
  µ('#adminExit').onclick = function() {
    visGroup.adminMode = false;
    showSelect();
  };

  µ('#playBoth').onSet = function() {
    µ('#visitorPlayer').pause();
    µ('#celebPlayer').pause();
  };

  µ('#playBoth').onReset = function() {
    µ('#visitorPlayer').play();
    µ('#celebPlayer').play();
  };

  // µ('#celebSlider').onMoved = () => {
  //   var _this = µ('#celebSlider');
  //   var cThumbs = µ('#celebThumbs');
  //   cThumbs.style.marginTop = -(cThumbs.scrollHeight - cThumbs.parentNode.clientHeight) * _this.getPercent() + 'px';
  // };
  //
  // µ('#celebThumbs').onMoved = () => {
  //   var _this = µ('#celebThumbs');
  //   var sld = µ('#celebSlider');
  //   sld.setPercent(-(parseFloat(_this.style.marginTop) / (_this.scrollHeight - _this.parentNode.clientHeight)));
  // };

  //////////////////////////////
  // idle timeout (if it hasn't been used recently)
  /////////////////////////////

  var resetTimer = null;

  //set a shorter timeout after the visitor video finishes playback
  µ('#visitorPlayer').onVideoEnd = ()=> {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(()=> {
      showSelect();
    }, 60000);
  };

  //set a longer timeout after each screenpress.
  µ('body')[0].onclick = ()=> {

    clearTimeout(resetTimer);
    resetTimer = setTimeout(()=> {
      showSelect();
    }, 120000);
  };
});
