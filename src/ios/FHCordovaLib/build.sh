#!/bin/bash

TARGET="FHCordovaLib"
CONFIGURATION="release"

DIST_DIR="dist"
PROJECT_PATH=`pwd`

rm -rf $DIST_DIR

xcodebuild clean
xcodebuild ARCHS="armv7 armv7s arm64" -alltargets -configuration $CONFIGURATION -sdk iphoneos build VALID_ARCHS="armv7 armv7s arm64" CONFIGURATION_BUILD_DIR="$PROJECT_PATH/build/device"

if [ $? != 0 ]; then
  echo "BUILD FOR DEVICE FAILED!"
  exit 1
fi

xcodebuild -arch i386 -alltargets -configuration $CONFIGURATION -sdk iphonesimulator build VALID_ARCHS="i386" CONFIGURATION_BUILD_DIR="$PROJECT_PATH/build/emulator"

if [ $? != 0 ]; then
  echo "BUILD FOR EMULATOR FAILED!"
  exit 1
fi

mkdir $DIST_DIR
lipo -create -output "$DIST_DIR/libFHCordovaLib.a" "$PROJECT_PATH/build/device/libFHCordovaLib.a" "$PROJECT_PATH/build/emulator/libFHCordovaLib.a"

if [ $? != 0 ]; then
  echo "FAILED TO CREATE UNIVERSAL BUILD"
  exit 1
fi

echo "ALL DONE!"
exit 0
