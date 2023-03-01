#include <Arduino.h>
#include "SerialController.h"

using namespace smm;

SerialController<> serial;


long baudrate = 115200;


class WatchedPin {
	protected:
	bool isHead;
	unsigned int pin;
	bool prevState;
	WatchedPin *next;

	public:
	WatchedPin(int pin, bool head=false) 
	: pin(pin), prevState(true), isHead(head), next(nullptr) {}

	void update() {
		if (!isHead) {
			// check if state is changed
			bool state = digitalRead(pin);
			if (state != prevState) {
				prevState = state;
				if (state == true) {
					serial.send("go-high", (int)pin);
				} else {
					serial.send("go-low", (int)pin);
				}
			}
		}


		// update children
		if (next != nullptr) {
			next->update();
		}
	}

	void addWatch(int pin) {
		if (next == nullptr) {
			next = new WatchedPin(pin);
		} else {
			next->addWatch(pin);
		}
	}
} watch(0, true);



void configureOutput(int pin) {
  serial.send("output-configured", pin);
	pinMode(pin, OUTPUT);
}

void configureInput(int pin) {
  serial.send("input-configured", pin);
	pinMode(pin, INPUT);
}

void configurePullup(int pin) {
  serial.send("pullup-configured", pin);
	pinMode(pin, INPUT_PULLUP);
}


void digital_read(int pin) {
	serial.send("read", digitalRead(pin));
}

void writeLow(int pin) {
  serial.send("writing-low", pin);
	digitalWrite(pin, 0);
}

void writeHigh(int pin) {
  serial.send("writing-high", pin);
	digitalWrite(pin, 1);
}

void watchPin(int pin) {
  serial.send("watching", pin);
	watch.addWatch(pin);
}


void setup() {
	serial.setup(baudrate);
	serial.addCallback("configure-output", configureOutput);
	serial.addCallback("configure-input", configureInput);
	serial.addCallback("configure-pullup", configurePullup);
	serial.addCallback("digital-read", digital_read);
	serial.addCallback("write-low", writeLow);
	serial.addCallback("write-high", writeHigh);
  serial.addCallback("watch-pin", watchPin);
}


void loop() {
	serial.update();
	watch.update();
}
