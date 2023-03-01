#include <Arduino.h>
#include "SerialController.h"

using namespace smm;

SerialController<> serial;


long baudrate = 115200;



void configureOutput(int pin) {
	pinMode(pin, OUTPUT);
}

void configureInput(int pin) {
	pinMode(pin, INPUT);
}

void configurePullup(int pin) {
	pinMode(pin, INPUT_PULLUP);
}


void digital_read(int pin) {
	serial.send("read", digitalRead(pin));
}

void writeLow(int pin) {
	digitalWrite(pin, 0);
}

void writeHigh(int pin) {
	digitalWrite(pin, 1);
}


void setup() {
	serial.setup(baudrate);
	seiral.addCallback("configure-output", configureOutput);
	serial.addCallback("configure-input", configureInput);
	serial.addCallback("configure-pullup", configurePullup);
	serial.addCallback("digital-read", digital_read);
	serial.addCallback("write-low", writeLow);
	serial.addCallback("write-high", writeHigh);
}


void loop() {
	serialController.update();
}
