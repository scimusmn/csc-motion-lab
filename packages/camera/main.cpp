#include <stdio.h>
#include <atomic>
#include <queue>
#include <thread>
#include <chrono>
#include <mutex>
#include <VwGigE.API.h>
#include "toojpeg/toojpeg.h"
#include "ctpl_stl.h"
#include "error.hpp"


using namespace VWSDK;
using namespace std::chrono_literals;


// constant settings
#define IMAGE_WIDTH  640
#define IMAGE_HEIGHT 480
#define FRAME_COUNT 800
#define WRITE_THREADS 8


// thread pool for writing files
ctpl::thread_pool write_pool(WRITE_THREADS);
// callback for processing frames
void frame_callback(OBJECT_INFO *object, IMAGE_INFO *image);
// count of the number of processed frames
atomic_long frame_count = 0;
// file prefix (used for path information)
const char *prefix;


// macro that defines how to release GigE resources
// it is modified over the course of the program as resources are loaded
#define RELEASE_RESOURCES

// macro to check for errors
// it uses RELEASE_RESOURCES to free GigE resources in case of errors
#define CHECK_ERROR(result, activity) \
do { \
	if (result != RESULT_SUCCESS) { \
		fprintf(stderr, "[FATAL] Failed to %s: %s (%d)\n", activity, result_to_string(result), result); \
		RELEASE_RESOURCES; \
		return 1; \
	} \
} while (0)


// --===== main =====--

int run(int argc, char** argv, bool is_retry);

int main(int argc, char** argv) {
	return run(argc, argv, false);
}


int run(int argc, char **argv, bool is_retry) {
	// get the file prefix (used to prepend "tempXXX\" to the filename)
	if (argc < 3) {
		fprintf(stderr, "[FATAL] Mus specify gain and file prefix!\n");
		return 1;
	}

	// configure the global parameters
	frame_count = 0;
	char* gain = argv[1];
	prefix = argv[2];

	// create GigE driver
	VWGIGE_HANDLE driver = NULL;
	RESULT result = OpenVwGigE(&driver);
	CHECK_ERROR(result, "create GigE driver");
	#undef RELEASE_RESOURCES
	#define RELEASE_RESOURCES CloseVwGigE(driver);

	// count available cameras
	UINT numCameras = 1;
	result = VwGetNumCameras(driver, &numCameras);
	CHECK_ERROR(result, "count available cameras");
	if (numCameras == 0) {
		fprintf(stderr, "[FATAL] No cameras were found!\n");
		RELEASE_RESOURCES;
		return 1;
	}

	// open camera
	HCAMERA camera = NULL;
	int user = 0;
	result = VwOpenCameraByIndex(
		driver,
		0, // index
		&camera,
		20, // number of buffers
		0, 0, 0, // width/height/packet size (zero for auto-detect)
		&user, // user pointer (CANNOT BE NULL OR THIS FUNCTION WILL ERROR FOR SOME REASON)
		frame_callback
	);
	CHECK_ERROR(result, "open camera");

	#undef RELEASE_RESOURCES
	#define RELEASE_RESOURCES \
		CameraClose(camera); \
		CloseVwGigE(driver);
	
	// configure camera
	result = CameraSetPixelFormat(camera, PIXEL_FORMAT_RGB8);
	CHECK_ERROR(result, "set camera pixel format");
	result = CameraSetCustomCommand(camera, "Gain", gain, true);
	CHECK_ERROR(result, "set camera gain");
	result = CameraSetWidth(camera, IMAGE_WIDTH);
	CHECK_ERROR(result, "set camera image width");
	result = CameraSetHeight(camera, IMAGE_HEIGHT);
	CHECK_ERROR(result, "set camera image height");

	// grab images
	result = CameraGrab(camera);
	CHECK_ERROR(result, "begin acquiring images");
	// testing found 450 ms to be the lowest working value to acquire 50 frames; we wait for 900ms to make ABSOLUTELY CERTAIN
	// that 50 frames are in the queue if the system is working
	std::this_thread::sleep_for(900ms);
	// communication errors usually produce either no frames or ~10 frames of output, so
	// we can identify them by waiting for a bit and checking our count
	if (frame_count < 50) {
		// some sort of communication error has occurred
		if (!is_retry) {
			// the camera ALWAYS fails to capture images the first time after it boots up for some reason
			// so we will try again one more time
			RELEASE_RESOURCES;
			write_pool.clear_queue();
			fprintf(stderr, "Communication error detected; retrying...\n");
			return run(argc, argv, true);
		}
		else {
			// we've tried again and it still isn't working...
			fprintf(stderr, "[FATAL] Communication error persists!\n");
			RELEASE_RESOURCES;
			write_pool.stop(false);
			return 1;
		}
	}

	// wait for all [FRAME_COUNT] images to arrive
	while (frame_count < FRAME_COUNT) {}
	RELEASE_RESOURCES; // release camera & gigE driver

	// wait for writes to complete
	printf("Acquiring finished, waiting for filesystem...\n");
	write_pool.stop(true);

	printf("Done!\n");
	return 0;
}


// --===== etc =====--

// image data struct
struct Image {
	unsigned int index;
	unsigned int w, h;
	unsigned char *data;

	// convert from VIS SDK image struct to this format
	void ConvertInfo(IMAGE_INFO *info) {
		w = info->width;
		h = info->height;
		data = new unsigned char[w * h * 3];
		memcpy(data, info->pImage, w * h * 3);
	}
};


// copy pixels from one (x, y) point to another in a different array
void copy_px(struct Image *img, unsigned char *dst, int x0, int y0, int x1, int y1)
{
	int w = img->w;
	int h = img->h;

	unsigned long source_index = 3*((w*y0) + x0);
	unsigned long dest_index = 3*((h*y1) + x1);

	for (int i=0; i<3; i++) {
		dst[dest_index+i] = img->data[source_index+i];
	}
}


// rotate an image
void rotate_ccw(struct Image *img) {
	// create the destination array
	unsigned char *dest = (unsigned char *) malloc(img->w * img->h * 3 * sizeof(unsigned char));

	// copy the image data, rotated 90 degrees
	for (unsigned int x=0; x<img->w; x++) {
		for (unsigned int y=0; y<img->h; y++) {
			int x0 = x;
			int y0 = y;
			int x1 = y;
			int y1 = img->w-x-1;
			copy_px(img, dest, x0, y0, x1, y1);
		}
	}

	// reassign the array
	free(img->data);
	img->data = dest;

	// swap the width and height
	unsigned int w = img->w;
	img->w = img->h;
	img->h = w;
}


// helper function for writing toojpeg output to disk
static void write(unsigned char byte, void *userdata) { fputc(byte, (FILE*) userdata); }

// write Image to disk, called from thread pool
void write_image(int unused, const char *prefix, Image img) {
	// rotate image to correct orientation
	rotate_ccw(&img);

	// compute filename as [prefix] + [number].jpg
	char filename[1024];
	snprintf(filename, 1024, "%s%03d.jpg", prefix, img.index);

	// open file
	FILE *writer = fopen(filename, "wb");
	if (writer != NULL) {
		// write jpeg data to disk
		TooJpeg::writeJpeg(write, writer, img.data, img.w, img.h, true, 90, false, "hello");
		fclose(writer);
	}
	else {
		fprintf(stderr, "[ERROR] Could not open \"%s\"\n", filename);
	}

	free(img.data);
}


// per-frame callback
void frame_callback(OBJECT_INFO *unused, IMAGE_INFO *image) {
	// check if we have alread collected the frames we need
	if (frame_count >= FRAME_COUNT) { return; }
	
	// copy the image data into an Image struct
	Image img;
	img.index = frame_count;
	img.ConvertInfo(image);

	// push to the thread pool
	write_pool.push(write_image, prefix, img);

	// increment frame count
	frame_count += 1;
}
