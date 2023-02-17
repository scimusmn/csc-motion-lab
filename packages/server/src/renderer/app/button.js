'use strict';

include([], function() {
  var buttonTag = inheritFrom(HTMLImageElement, function() {
    this.attachedCallback = function() {
      var _this = this;

      var inactiveSrc = _this.src;
      var dot = _this.src.lastIndexOf('.');
      var activeSrc = _this.src.substring(0, dot) + '-active' + _this.src.substring(dot);

      _this.src = inactiveSrc;

      _this.onClick = () => {};

      _this.onmouseup = () => {
        if (_this.pressed) _this.onClick();
        _this.pressed = false;
        if (document.onmouseup == _this.onmouseup) document.onmouseup = null;
        _this.src = inactiveSrc;
      };

      _this.onmousedown = function(e) {
        e.preventDefault();
        _this.pressed = true;
        document.onmouseup = _this.onmouseup;
        _this.src = activeSrc;
      };
    };
  });

  var ButtonTag = document.registerElement('but-ton', { prototype: buttonTag.prototype, extends: 'img' });
});
