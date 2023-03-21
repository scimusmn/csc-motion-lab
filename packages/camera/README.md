packages/camera
===============

This program connects does the following:

  1. connects to a Vieworks high-speed camera via LAN
  2. grabs a preset number of frames from it, and
  3. saves them as JPEGs with a command-line configurable file prefix


requirements
------------

We require the VIS 7 SDK to be installed, which can be found on [the Vieworks website], or, if that is no longer available, a backup copy is [on the SMM drive].

The software is built in [Visual Studio], and uses CMake and C++, so be sure to install those components when installing Visual Studio.

usage
-----

`camera-capture.exe [GAIN] [PREFIX]`

* The gain is a number. Somewhere between 0 and 20 is good for most lighting conditions.
* The prefix is attached to each image when saving, and CAN contain paths (e.g. "temp0\" will wind up saving the images in the folder "temp0")


files
-----

* `CPP/` - contains `.lib` files for backup linking to VIS.
* `toojpeg/` - 3rdparty JPEG-conversion library
* `CMake*` - build specification
* `README.md` - hey! hi! that's me!
* `ctpl_stl.h` - 3rdparty thread pool library
* `error.*` - convert VIS SDK error codes into human-readable strings
* `main.cpp` - where the action happens
* `nodes.md` - notes on things that came up while developing. very spur-of-the-moment; read at your own risk




[the Vieworks website]: http://download.vieworks.com/main2?list_type=list&tag_list=&file_type=5#none
[on the SMM drive]: https://drive.google.com/file/d/1Q7Z2MLfjKAJdHagNj5xjKtxAxAOvEfz1/view?usp=share_link
[Visual Studio]: https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=Community&channel=Release&version=VS2022&source=VSLandingPage&cid=2030&passive=false
