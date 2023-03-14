exports.config = {
  recordTime: 3000, // ms
  frameRate: 200,
  numImage: 800,
  cameraGain: 7,
  setsToStore: 16,
  pathToCamera: '../camera/out/build/x64-Release/camera-capture.exe',
  fileSaveDelay: 10 * 1000, // ms to wait after cam script runs to assume files have finished saving
};
