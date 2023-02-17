'use strict';

include([], function() {
  var thumbnail = inheritFrom(HTMLElement, function() {

    this.createdCallback = function() {
      var _this = this;

      //_this.thumb = µ('+img', _this);

      _this.onSelect = () => {};

      //these callbacks were used when the thumbgroup could scroll, not really used now.
      _this.onMouseStart = (which) => {};

      _this.onMouseFinish = () => {};

      //grabs the middle image from the set for the thumbnail image.
      _this.setImage = ()=> {
        var jpgPath = "url('" + _this.setName + '/400.jpg?' + Math.random() + "')";
        console.log('--setImage', jpgPath);
        _this.style.backgroundImage = jpgPath;
      };
    };

    this.attachedCallback = function() {
      var _this = this;

      _this.setName = µ('|>setName', _this);
      _this.start = { x:0, y:0 };
      _this.init = { x:0, y:0 };

      //clears the class name, gets rid of 'active' class.
      _this.reset = () => {
        _this.className = '';

        //_this.thumb.src = _this.setName + '/400.jpg?' + Math.random();
        //_this.setImage();
      };

      //when clicked, set the document mouseup to the thumbnail mouseup, do callbacks
      _this.onmousedown = (e) => {
        e.preventDefault();
        _this.clicked = true;
        document.onmouseup = _this.onmouseup;
        _this.onMouseStart(_this);
      };

      //if we click up on the same thumb as we clicked down on,
      // set this thumbnail as selected, and do the select callback
      _this.onmouseup = function(e) {
        if (_this.clicked) {
          var rest = µ('thumb-nail');
          for (var i = 0; i < rest.length; i++) {
            rest[i].reset();
          }

          _this.className = 'active';
          _this.onSelect();
        }

        _this.onMouseFinish();

        _this.clicked = false;
        document.onmouseup = null;
        document.onmousemove = null;
      };

      _this.refreshSet = function() {
        _this.setImage();
      };
    };

    //if we see the 'setname' attribute for the set change, refresh the thumbnail
    // and store the new set name.
    this.attributeChangedCallback = function(attr, oldVal, newVal) {
      var _this = this;
      if (attr == 'setname') {
        _this.setName = newVal;
        _this.setImage();
      }
    };
  });

  var Thumbs = document.registerElement('thumb-nail', thumbnail);

  // custom element to hold all of the thumbnails
  var thumbGroup = inheritFrom(HTMLElement, function() {
    this.createdCallback = function() {
      var _this = this;

      _this.player = µ('#' + µ('|>player', _this)); //grab the element used to play back videos.
      _this.max = parseInt(µ('|>max', _this));      //store the max number of sequences to display
      //check if the 'scrollable' flag is set
      _this.scrollable = (µ('|>scrollable', _this) == 'true');
      _this.activeThumb = null;       //var to store which thumb was clicked at mousedown
      _this.start = { x:0, y:0 };
      _this.init = { x:0, y:0 };

      //record a thumbnail that was pressed at mousedown.
      _this.logThumb = (aTh) => {
        _this.activeThumb = aTh;
      };

      _this.onMoved = () => {};

      //not really used anymore, but if the group is scrollable, store the
      //initial mouse location, and set the clicked flag.
      _this.onmousedown =  (e) => {
        if (_this.scrollable) {
          _this.clicked = true;
          _this.start.y = e.clientY - extractNumber(_this.style.marginTop);
          _this.init.y = e.clientY;
        }
      };

      //moves the contents of this element, if scrollable. Not actively used, still enabled.
      _this.onmousemove = function(e) {
        if (_this.scrollable && _this.clicked && _this.scrollHeight > _this.parentNode.clientHeight) {
          if (Math.abs(e.clientY - _this.init.y) > 20 && _this.activeThumb)
            _this.activeThumb.clicked = false;
          var offset = e.clientY - _this.start.y;
          var max = _this.parentNode.clientHeight - _this.scrollHeight;
          if (offset > 0) offset = 0;
          else if (offset < max) offset = max;
          _this.style.marginTop = offset + 'px';

          _this.onMoved();
        }
      };

      _this.onmouseup = () => {
        _this.clicked = false;
      };

      _this.onChoose = (set) => {

      };

      _this.resetActive = ()=> {
        var actives = µ('.active', _this);
        if (actives.length) {
          for (var i = 0; i < actives.length; i++) {
            actives[i].className = '';
          }
        }
      };

      //this function handles new or changed sets, based on their directory name
      this.handleSet = function(setName) {
        var set = null;

        // if this group has an element with the setname attribute matching 'setName'
        if (µ('[setName="' + setName + '"]') && µ('[setName="' + setName + '"]').length) {
          //tell the thumbnails to refresh the image, and pop the thumbnail element
          set = µ('[setName="' + setName + '"]')[0];
          console.log(setName + ' is the set name');
          set.setAttribute('setName', setName);
          set.refreshSet();
          _this.removeChild(set);
        } else {  //else, if there is not a set with that name
          //delete the oldest set if we have too many displayed
          if (_this.childNodes.length >= _this.max) _this.removeChild(_this.lastChild);

          // and create a new thumbnail with the appropriate set name.
          set = document.createElement('thumb-nail');
          set.setAttribute('setName', setName);

          //tell the thumbnail to load the set into the player when clicked,
          // and do the onChoose callback.
          set.onSelect = function() {
            _this.onChoose(set);
            _this.player.loadSet(set.setName + '/');
          };

          //tell the set to report back to the group when clicked
          set.onMouseStart = _this.logThumb;
          set.onMouseFinish = _this.onmouseup;
        }

        //insert the set to the beginning of the child elements of this
        if (_this.childNodes.length > 1) {
          _this.insertBefore(set, _this.firstChild);
        } else {
          _this.appendChild(set);
        }
      };

    };
  });

  var ThumbGroup = document.registerElement('thumb-group', thumbGroup);

  //console.log(visitorCaps);
});
