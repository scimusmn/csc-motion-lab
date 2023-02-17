
'use strict';

include([], function() {

  // create a custom element from the canvas element
  var flipBook = inheritFrom(HTMLCanvasElement, function() {
    this.attachedCallback = function() {
      console.log('new book');
      var _this = this;
      var ctx = _this.getContext('2d');

      //create the default array of images
      _this.frames = [];      //create the array of images which we flip through
      _this.sets = {};        //create object to store cached sets.
      _this.currentFrame = 0;      //stores the value of the current image being displayed
      _this.loaded = false,
      _this.playing = false,
      _this.loading = false;    //keeps track of whether or not the images are loaded.
      _this.curDir = 'default/';  //storing the name of the directory which we are currently browsing.
      _this.size = 0;             //stores the number of loadable images.

      _this.cache = false;

      _this.imageOffset = { x: 0, y: -40 }; //stores the offset of the images to display, for cropping

      //init handlers:
      _this.onStop = () => {};

      _this.onUpdate = () => {};

      _this.onLoad = () => {};

      _this.onStateChange = ()=> {};

      var loadingImg = new Image();

      loadingImg.src = 'assets/pngs/loading.png';

      //returns the current frame of playback
      _this.current = function(aug) {
        if (!aug) aug = 0;

        let img = _this.set[_this.currentFrame + aug];
        if (!img.loaded || !img.complete || (typeof img.naturalWidth != 'undefined' && img.naturalWidth == 0)) return null;
        return img;
      };

      //this is declaring member functions of the book class. The init function is used to load the images
      // from the disk, and inform the rest of the class when they are loaded. It also clears out old info.

      _this.init = function(num) {
        _this.loading = true;
        _this.frames = [];
        _this.loaded = false;

        //_this.width = _this.width;      //this clears the html5 canvas, for some reason

        for (let x = 1; x <= num; x++) {
          let imageObj = new Image();                       // new instance for each image
          imageObj.loaded = false;
          _this.frames.push(imageObj);
        }
      };

      //creates new arrays of frames. Used for cached images.
      _this.makeNewSet = (dir)=> {
        _this.sets[dir] = [];
        for (let x = 1; x <= _this.frames.length; x++) {
          let imageObj = new Image();                       // new instance for each image
          imageObj.loaded = false;
          _this.sets[dir].push(imageObj);
        }

        _this.sets[dir].loaded = false;
        _this.sets[dir].size = 0;
      };

      //check to see if a cached set exists. If not, create it.
      _this.checkForSet = (dir)=> {
        dir = dir.replace('/', '_');
        console.log(dir);
        if (!_this.sets[dir]) _this.makeNewSet(dir);
        else _this.set.loaded = true;
        _this.set = _this.sets[dir];
      };

      //load set from the server, or, if cached, point to the correct set.
      _this.loadSet = function(dir) {
        _this.width = _this.clientWidth;
        _this.height = _this.clientHeight;
        _this.curDir = dir;                       //save the directory name
        if (_this.cached) _this.checkForSet(dir); // check for set if cached
        else {                                    // else, point to the default frame buffer
          _this.set = _this.frames;
          _this.set.loaded = false;
          _this.set.size = 0;
        }

        _this.reset();

        _this.set.totalImgs = 0;      //clear variable holding total number of images.

        let set = _this.set;
        if (!_this.set.loaded) {      //if the set isn't loaded (ie, not cached)
          for (let i = 0; i < _this.set.length; i++) {
            let img = _this.set[i];
            img.loaded = false;

            //set the source of the next image, and assign a random number to it,
            // if not cached, to prevent caching.
            var src = dir + zeroPad(i, 3) + '.jpg';
            if (!_this.cached) src += '?' + Math.random();
            img.src = src;
            img.onload = () => {
              img.loaded = true;
              set.totalImgs++;
              set.size++;
              if (set.totalImgs == set.length) {
                set.loaded = true;
                _this.onLoad();
              }
            };

            img.onerror = (e) => {
              set.totalImgs++;
              e.preventDefault();
              if (set.totalImgs == set.length) {
                set.loaded = true;
                _this.onLoad();
              }
            };
          }
        } else _this.onLoad();
      };

      // _this.unload = function() {
      //   _this.set.loaded = _this.loading = _this.playing = false;
      //   for (var i = 0; i < _this.frames.length; i++) {
      //     _this.frames[i].src = null;
      //   }
      //
      //   _this.frames = null;
      //   _this.frames = [];
      // };

      _this.changeNotLoadedImage = function(title) {
        defaultSrc = title;
      };

      //draws an image into the context, rotated by degrees
      function drawRotated(degrees, img) {

        // save the unrotated ctx of the _this so we can restore it later
        // the alternative is to untranslate & unrotate after drawing
        ctx.save();

        // move to the center of the canvas (_this)
        ctx.translate(_this.width / 2, _this.height / 2);

        // rotate the ctx to the specified degrees
        ctx.rotate(degrees * Math.PI / 180);

        // draw the image
        // since the ctx is rotated, the image will be rotated also
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // we’re done with the rotating so restore the unrotated ctx
        ctx.restore();
      }

      var degs = 0;

      _this.idle = function() {            //increment the image pointer, if we are playing
        if (_this.playing && _this.currentFrame < _this.set.size - 1 && _this.current(1).loaded) {
          _this.currentFrame++;
          _this.onUpdate();
        } else if (_this.currentFrame >= _this.set.size - 1 && _this.playing) {
          //if we've reached the end of the video, stop playback, and do callbacks.
          _this.stop();
          _this.onStop();
        }

        ctx.globalAlpha = 1;
        if (_this.current()) //if image is available, draw it to the canvas.
          ctx.drawImage(_this.current(), _this.imageOffset.x, _this.imageOffset.y, _this.width - _this.imageOffset.x, _this.height - _this.imageOffset.y);

        //if we're loading images still, draw the spinning loading image.
        if (!_this.set.loaded) {
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.rect(0, 0, _this.width, _this.height);
          ctx.fillStyle = 'black';
          ctx.fill();
          ctx.globalAlpha = 1;
          drawRotated(degs, loadingImg);
          degs = (degs + 10) % 360;
        }
      };

      _this.play = function() {
        _this.playing = true;
        _this.onStateChange();
      };

      _this.stop = function() {
        _this.playing = false;
        _this.onStateChange();
      };

      _this.togglePlay = function() {
        if (_this.playing) _this.stop();
        else _this.play();
      };

      _this.setFrameNumber = function(val) {
        _this.currentFrame = val;
      };

      _this.setFrameByPercent = function(perc) {
        _this.currentFrame = Math.round(perc * (_this.set.length - 1));
      };

      _this.getPercentDone = function() {
        return _this.currentFrame / _this.set.size;
      };

      //reset the container after we're done viewing
      _this.reset = function() {
        if (_this.set) {
          console.log('resetting ' + _this.curDir);
          _this.currentFrame = 0;
          _this.stop();
          _this.width = _this.width;
          if (!_this.cached) {
            for (let i = 0; i < _this.frames.length; i++) {
              _this.frames[i].loaded = false;
            }
          }

          _this.onUpdate();
        }
      };

    };
  });

  window.FlipBook = document.registerElement('flip-book', { prototype: flipBook.prototype, extends: 'canvas' });
});
