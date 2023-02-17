### Motion Lab - Connecticut Science Center

## Packages
- **arduino** - code to be loaded onto Arduino
- **camera** - facilitates communication with high speed camera
- **client** - web page to be displayed on exhibit touchscreens
- **server** - stripped down custom Stele (Electron) application. Serves client web page, communicates through serial with arduino, and triggers camera captures

### Installation
- `cd packages/server`
- `yarn`
- Open Google Drive to download entire Assets folder: https://drive.google.com/drive/folders/1En-x5AFxpYtD-GaVLhCsWP_jjJYA7HNH
- Copy contents of `assets` folder into `packages/client/assets/`
- Copy contents of `celeb_seq` folder into `packages/client/celeb_seq/`
- Copy contents of `sequences` folder into `packages/client/sequences/`
- Copy contents of `server-assets` folder into `packages/server/src/renderer/assets/`

## TODO
- Document how to swap in new athlete image sequences
- Document how to swap in athlete text (https://d.pr/i/EPuWiL)