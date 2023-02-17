'use strict';

include([], function() {
  var toggleTag = inheritFrom(HTMLImageElement, function() {
    this.createdCallback = function() {
      var _this = this;
    };

    this.attachedCallback = function() {
      var _this = this;
      _this.active = false;
      var activeSrc = µ('|>active', _this);
      var inactiveSrc = µ('|>inactive', _this);

      _this.src = inactiveSrc;

      _this.onSet = () => {};

      _this.onReset = () => {};

      _this.set = function() {
        _this.active = true;
        _this.src = activeSrc;
      };

      _this.reset = function() {
        _this.active = false;
        _this.src = inactiveSrc;
      };

      _this.toggle = () => {
        if (_this.active) {
          console.log('reset');
          _this.reset();
          _this.onReset();
        } else {
          console.log('set');
          _this.set();
          _this.onSet();
        }
      };

      _this.onmousedown = (e)=>{
        e.preventDefault();
      }

      _this.onclick = function(e) {
        e.preventDefault();
        _this.toggle();
      };
    };
  });

  window.ToggleButton = document.registerElement('tog-gle', { prototype: toggleTag.prototype, extends: 'img' });
});
