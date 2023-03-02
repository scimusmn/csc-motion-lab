#include <Arduino.h>
#include "SerialController.h"

using namespace smm;

SerialController<> serial;


long baudrate = 115200;

#define WATCH_DEBOUNCE 10

class WatchedPin {
	protected:
	bool isHead;
	unsigned int pin;
	bool prevState;
	WatchedPin *next;
	bool debouncing;
	unsigned long debounceEnd;

	public:
	WatchedPin(int pin, bool head=false) 
	: pin(pin), isHead(head) {
		prevState = true;
		next = nullptr;
		debouncing = false;
		debounceEnd = 0;
	}

	void update() {
		if (!isHead && !debouncing) {
			// check if state is changed
			bool state = digitalRead(pin);
			if (state != prevState) {
				debouncing = true;
				debounceEnd = millis() + WATCH_DEBOUNCE;
				prevState = state;
				if (state == true) {
					serial.send("go-high", (int)pin);
				} else {
					serial.send("go-low", (int)pin);
				}
			}
		}

		if (debouncing && debounceEnd <= millis()) {
			serial.send("debounce-end", (int)pin);
			debouncing = false;
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
