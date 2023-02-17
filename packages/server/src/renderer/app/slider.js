'use strict';

include([], function() {
  //custom slider element
  var sliderTag = inheritFrom(HTMLElement, function() {
    this.createdCallback = function() {
      var _this = this;

      //create the knob on the slider track.
      _this.handle = µ('+div', _this);
      _this.handle.className = 'slider-handle';
    };

    this.attachedCallback = function() {
      var _this = this;
      _this.orient = µ('|>orient', _this);

      //get the orientation of the slider from the tag attribute
      var mName = ((_this.orient == 'vert') ? 'marginTop' : 'marginLeft');
      var eName = ((_this.orient == 'vert') ? 'Y' : 'X');
      var rName = ((_this.orient == 'vert') ? 'top' : 'left');
      var sName = ((_this.orient == 'vert') ? 'clientHeight' : 'clientWidth');

      _this.clicked = false;
      _this.offset = 0;
      _this.start = 0;

      //returns the appropriate top or left margin
      var margin = function() {
        return _this.handle.style[mName];
      };

      //returns the relevant width or height of the handle
      var handleSize = function() {
        return parseFloat(_this.handle[sName]);
      };

      //returns the relevant width or height of the background (main tag)
      var bgSize = function() {
        return parseFloat(_this[sName]);
      };

      _this.setPercent = function(perc) {
        _this.handle.style[mName] = (perc * (bgSize() - handleSize())) + 'px';
      };

      _this.getPercent = function() {
        return parseFloat(margin()) / (parseFloat(bgSize()) - handleSize());
      };

      _this.onMoved = () => {};

      //handles the movement of the handle, based on the offset from
      // the upper left hand corner of the background
      _this.moveHandle = function(off) {
        if (off > bgSize() - handleSize()) off = bgSize() - handleSize();
        else if (off < 0) off = 0;
        _this.handle.style[mName] = off + 'px';

        //do callback, if it's set.
        _this.onMoved();
      };

      _this.handle.onmousemove = function(e) {
        if (_this.clicked) _this.moveHandle((e['client' + eName] -  (_this.start - _this.offset)));
      };

      _this.handle.onmouseup = function() {
        _this.clicked = false;
        document.onmousemove = null;
        document.onmouseup = null;
      };

      _this.handle.onmousedown = function(e) {
        _this.clicked = true;
        var rect = _this.handle.getBoundingClientRect();
        _this.offset = 0;
        _this.start = e['client' + eName];
      };

      //when this tag is clicked,
      _this.onmousedown = function(e) {
        _this.clicked = true;                     //set the clicked flag
        var bg = _this.getBoundingClientRect();   //get bounding rectangles
        var hnd = _this.handle.getBoundingClientRect();
        _this.offset = hnd[rName] - bg[rName];    //calculate initial offset of handle from background
        _this.start = e['client' + eName];        //get the starting mouse pos
        //move the handle to the initial mouse pos
        _this.moveHandle(e['client' + eName] - (bg[rName] + handleSize() / 2));

        //set the document mouse functions to the handles mouse functions, to catch
        //moves that go outside the slider bounds.
        document.onmousemove = _this.handle.onmousemove;
        document.onmouseup = _this.handle.onmouseup;
        return false;                             //prevent defaults from firing
      };
    };
  });

  window.Slider = document.registerElement('sli-der', sliderTag);
});
