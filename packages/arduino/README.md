packages/arduino
================

This sketch allows for fairly arbitrary pin configuration and manipulation via serial commands. 
It communicates at 115200 baud and uses messages of the form `{[command]:[pin]}`. The command can be any of the following:

| Command            | Description                                          |
|--------------------|------------------------------------------------------|
| `configure-output` | Configure the specified pin as an output.            |
| `configure-input`  | Configure the specified pin as an input.             |
| `configure-pullup` | Configure the specified pin as an input pulled high. |
| `digital-read`     | Read the current value of the pin. Sends back the message `{read:x}`, where x is either 0 or 1. |
| `write-low`        | Sets the specified pin low.                          |
| `write-high`       | Sets the specified pin high.                         |
| `watch-pin`        | Sets a watch on the pin, so that whenever it changes a message (either `{go-high:[pin]}` or `{go-low:[pin]}`) will be transmitted. |


files
-----

* `FixedSizeString.h` - the `smm::FixedSizeString` class, which does normal string-y things but in a no-heap way
* `LookupTable.h` - implements an associative array data type
* `SerialController.h` - where most of the ✨serial magic✨ happens
* `motion-lab-arduino.ino` - the command callbacks & the setup() and loop() arduino functions
