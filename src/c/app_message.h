#pragma once
#include <pebble.h>

typedef enum {
  AppKeyConfigured = 0, // Sent by JS at startup so that watch can tell user whether they need to configure app before use.

  AppKeyGetCaches,      // Send by watch when hitting refresh in menu
    
  AppKeyStatusDesc,     // Send by JS to show textual progress of getting geocaches
  AppKeyStatusProgress, // Sent by JS to show percentage progress of getting geocaches
  AppKeyStatusStage,    // Sent by JS to show stage progress of getting geocaches
  AppKeyStatusError,    // NOT IMPLEMENTED YET-WILL SHOW ERRORS WHEN GETTING LIST OF GEOCACHES
  
  AppKeyGeocaches,      // Sent by JS; serialised list of up to 100 geocache details
  AppKeyNumCaches,      // Sent along with AppKeyGeocaches, describing how many geocaches to parse
  
  AppKeyStartNav,       // Sent by watch when cache window is loaded
  AppKeyStopNav,        // Sent by watch when cache window is unloaded
  
  AppKeyDistance,       // Sent by JS when navigating to geocache
  AppKeyBearing,        // Sent by JS when navigating to geocache
} AppKey;

void inbox_dropped_handler(AppMessageResult reason, void *context);
void inbox_received_handler(DictionaryIterator *iter, void *context);
void send_message_with_int(AppKey key, int number);
