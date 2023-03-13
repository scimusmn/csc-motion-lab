/* eslint-disable */

"use strict";


const pins = {
	PIN_BRIGHTSIGN_AUDIO: 22,
	PIN_BRIGHTSIGN_PRACTICE: 21,
	PIN_BRIGHTSIGN_GO: 20,

	PIN_GREEN_EXIT_LIGHT: 3,
	PIN_RED_EXIT_LIGHT: 4,
	PIN_GREEN_PRACTICE_LIGHT: 5,
	PIN_RED_PRACTICE_LIGHT: 6,

	PINS_POLL_LIGHTS: [ 11, 10, 9, 8, 7 ],
	PIN_POLL_LIGHT_GREEN: 7,
	PIN_POLLI_LIGHT_RED: 11,

	PIN_START_COUNTDOWN_BTN: 2,
	PIN_EXIT_CAGE_SENSOR: 23,
	PIN_PRACTICE_CAGE_SENSOR: 12,
};


module.exports = function(arduino) {
	arduino.configureDigitalOutput(pins.PIN_BRIGHTSIGN_AUDIO);
	arduino.configureDigitalOutput(pins.PIN_BRIGHTSIGN_PRACTICE);
	arduino.configureDigitalOutput(pins.PIN_BRIGHTSIGN_GO);

	arduino.configureDigitalOutput(pins.PIN_GREEN_EXIT_LIGHT);
	arduino.configureDigitalOutput(pins.PIN_RED_EXIT_LIGHT);
	arduino.configureDigitalOutput(pins.PIN_GREEN_PRACTICE_LIGHT);
	arduino.configureDigitalOutput(pins.PIN_RED_PRACTICE_LIGHT);

	for (let pin of pins.PINS_POLL_LIGHTS) {
		arduino.configureDigitalOutput(pin);
	}
	arduino.configureDigitalOutput(pins.PIN_POLL_LIGHT_GREEN);
	arduino.configureDigitalOutput(pins.PIN_POLLI_LIGHT_RED);

	arduino.configureInputPullup(pins.PIN_START_COUNTDOWN_BTN);
	arduino.configureInputPullup(pins.PIN_EXIT_CAGE_SENSOR);
	arduino.configureInputPullup(pins.PIN_PRACTICE_CAGE_SENSOR);

	return pins;
};
