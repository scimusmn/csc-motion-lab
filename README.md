### Motion Lab - Connecticut Science Center

## Packages
- **arduino** - code to be loaded onto Arduino
- **camera** - facilitates communication with high speed camera
- **client** - web page displayed on exhibit touchscreens
- **server** - stripped down custom Stele (Electron) application. Serves client web page, communicates through serial with arduino, and triggers camera captures

## Installation - development
- `cd packages/server`
- `yarn`
- Download entire [Assets folder](https://drive.google.com/drive/folders/1En-x5AFxpYtD-GaVLhCsWP_jjJYA7HNH) from Google Drive
  - Copy contents of `assets` into `packages/client/assets/`
  - Copy contents of `celeb_seq` into `packages/client/celeb_seq/`
  - Copy contents of `sequences` into `packages/client/sequences/`
  - Copy contents of `server-assets` into `packages/server/src/renderer/assets/`
- `yarn dev`
- After Stele opens displaying admin interface, open a Google Chrome (v78) browser and navigate to `http://localhost/` 

## TODO
- Document how to swap in new athlete image sequences
- Document how to swap in new athlete text (https://d.pr/i/EPuWiL)