exports.config = {
  recordTime: 3000, // ms
  frameRate: 200,
  numImage: 800,
  imageGain: 3.99,
  setsToStore: 16,
  pathToCamera: '/home/pi/photobooth/camera.sh',
  fileSaveDelay: 10 * 1000, // ms to wait after cam script runs to assume files have finished saving
};
