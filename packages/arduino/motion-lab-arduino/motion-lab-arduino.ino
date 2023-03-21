#include <Arduino.h>
#include "SerialController.h"

using namespace smm;

SerialController<> serial;


long baudrate = 115200;

#define WATCH_DEBOUNCE 10


// class for storing pin watches
// new watches are added on to the HEAD watch as a linked list
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
		prevState = true; // most inputs will be pulled up by default
		next = nullptr;
		debouncing = false;
		debounceEnd = 0;
	}

	void update() {
		if (!isHead && !debouncing) {
			// check if state is changed (HEAD will never do this)
			bool state = digitalRead(pin);
			if (state != prevState) {
				// we just changed
				debouncing = true;
				debounceEnd = millis() + WATCH_DEBOUNCE; // stop debouncing after WATCH_DEBOUNCE milliseconds
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

		// recursively update children
		if (next != nullptr) {
			next->update();
		}
	}

	void addWatch(int pin) {
		if (next == nullptr) {
			// this is the last element in the list, append a new watch
			next = new WatchedPin(pin);
		} else {
			// recursively traverse the list until we get to the end
			next->addWatch(pin);
		}
	}
} watch(0, true); // create a HEAD watch (whose update() will only update the children in the list)



// configure a pin as an output
void configureOutput(int pin) {
	serial.send("output-configured", pin);
	pinMode(pin, OUTPUT);
}

// configure a pin as an input
void configureInput(int pin) {
	serial.send("input-configured", pin);
	pinMode(pin, INPUT);
}

// configure a pin as an input with pullup resistor
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

// add a watch to on a pin
void watchPin(int pin) {
	serial.send("watching", pin);
	watch.addWatch(pin);
}


void setup() {
	serial.setup(baudrate);

	// attach the callback functions to string keys
	serial.addCallback("configure-output", configureOutput);
	serial.addCallback("configure-input", configureInput);
	serial.addCallback("configure-pullup", configurePullup);
	serial.addCallback("digital-read", digital_read);
	serial.addCallback("write-low", writeLow);
	serial.addCallback("write-high", writeHigh);
	serial.addCallback("watch-pin", watchPin);
}


void loop() {
	// check for serial messages
	serial.update();
	// check for watched pin state changes
	watch.update();
}
