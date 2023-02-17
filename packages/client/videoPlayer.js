'use strict';

include(['flipbook.js', 'slider.js', 'toggleButton.js'], function() {
  //custom element for playing back the image sets.
  var playerTag = inheritFrom(HTMLElement, function() {
    this.createdCallback = function() {
      var _this = this;

      var idleTimer = null;

      //create the header that holds celebrity athlete names and organizations.
      _this.header = µ('+div', _this);
      _this.header.className = 'athleteInfo sideBySide';
      _this.athlete = µ('+div', _this.header);
      _this.org = µ('+div', _this.header);

      //create the Flipbook element that actually plays back images
      _this.player = new FlipBook();
      _this.appendChild(_this.player);

      //init the players with 800 frames of storage.
      //TODO: pull this from config.js instead.
      _this.player.init(800);

      //create the play/pause button.
      //TODO: change ToggleButton to use CSS for active and inactive images.
      _this.button = new ToggleButton();
      _this.button.setAttribute('active', 'assets/pngs/play-one.png');
      _this.button.setAttribute('inactive', 'assets/pngs/pause-one.png');
      _this.button.className = 'justYou';

      //Create the video scrubber and set the orientation to horizontal
      _this.slider = new Slider();
      _this.slider.setAttribute('orient', 'horiz');

      //make a div to hold the play button and slider.
      _this.controls = µ('+div', _this);
      _this.controls.className = 'controls';
      _this.controls.appendChild(_this.button);
      _this.controls.appendChild(_this.slider);

      //add the controls div to the root element.
      _this.appendChild(_this.controls);

      _this.onVideoEnd = ()=> {};

      //when the video ends in the player, set the play button, and make the
      // onVideoEnded callback.
      _this.player.onStop = function() {
        console.log('ended');
        _this.button.set();
        _this.onVideoEnd();
      };

      //set the player's onUpdate so that it updates the scrubber after each frame
      _this.player.onUpdate = () => {
        _this.slider.setPercent(_this.player.getPercentDone());
      };

      //when the play/pause button is set to show the 'play' button, stop the video
      _this.button.onSet = () => {
        _this.player.stop();
      };

      //and when it is set to show 'pause', reset the video if it's at the end of playback
      // and begin playing the video.
      _this.button.onReset = () => {
        if (_this.slider.getPercent() >= .99) _this.player.setFrameByPercent(0);
        _this.player.play();
      };

      //when the slider handle moves, set the frame in the player by the current
      // slider percentage, stop the video playback, and show the 'play' button.
      _this.slider.onMoved = () => {
        _this.player.setFrameByPercent(_this.slider.getPercent());
        _this.player.stop();
        _this.button.set();
      };

      _this.onLoad = () => {

      };

      _this.player.onLoad = () => {
        _this.onLoad();
      };

      _this.loadSet = (dir) => {
        console.log(dir + ' in videoP');
        clearInterval(idleTimer);
        idleTimer = setInterval(_this.player.idle, 50);
        ajax(dir + 'info.html', (html)=> {
          //console.log(html);
          if (html) {
            console.log(µ('name', html)[0]);
            _this.athlete.textContent = µ('name', html)[0].textContent;
            _this.org.textContent = µ('org', html)[0].textContent;
          }
        });
        _this.player.loadSet(dir);
      };

      _this.onUnload = () => {

      };

      _this.unload = () => {
        clearInterval(idleTimer);
        _this.athlete.textContent = '';
        _this.org.textContent = '';
        _this.player.reset();
      };

      _this.play = () => {
        _this.player.play();
        _this.button.reset();
      };

      _this.pause = () => {
        _this.player.stop();
        _this.button.set();
      };
    };

    this.attachedCallback = function() {

    };
  });

  window.VideoPlayer = document.registerElement('video-player', playerTag);
});
