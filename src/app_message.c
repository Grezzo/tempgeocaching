#include <pebble.h>
#include "app_message.h"
#include "geocaching.h"
#include "menu_window.h"
#include "start_window.h"
#include "status_window.h"
#include "error_window.h"

void inbox_dropped_handler(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message dropped: %i", reason);
}

void inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *configured_tuple = dict_find(iter, AppKeyConfigured);
    
  Tuple *status_description_tuple = dict_find(iter, AppKeyStatusDesc);
  Tuple *status_progress_tuple = dict_find(iter, AppKeyStatusProgress);
  Tuple *status_stage_tuple = dict_find(iter, AppKeyStatusStage);
  Tuple *status_error_tuple = dict_find(iter, AppKeyStatusError);
  
  Tuple *geocaches_tuple = dict_find(iter, AppKeyGeocaches);
  Tuple *num_caches_tuple = dict_find(iter, AppKeyNumCaches);
  
  if (configured_tuple) {
    bool configured = configured_tuple->value->int16;
    if (configured) {
      update_start_window_message("Getting Geocaches");
    } else {
      update_start_window_message("Not Configured");
    }
    
  } else if(status_description_tuple) {
    show_status_window();
    hide_start_window();
    hide_menu_window();
    hide_error_window();
    char *status_description = status_description_tuple->value->cstring;
    int status_stage = status_stage_tuple->value->int32;
    int status_progress = status_progress_tuple->value->int32;
    update_status_window(status_description, status_stage, status_progress);
    
  } else if(status_error_tuple) {
    char *error_description = status_error_tuple->value->cstring;
    //show_error(status_description);
    //NEED TO REMOVE ERROR FEATURES FROM STATUS WINDOW
    show_error_window(error_description);
    hide_start_window();
    hide_status_window();
    hide_menu_window();

  } else if(geocaches_tuple) {
    char *serialised_geocaches = geocaches_tuple->value->cstring;
    int num_caches = num_caches_tuple->value->int32;
    process_batch_of_geocaches(num_caches, serialised_geocaches);
    show_menu_window();
    hide_start_window();
    hide_status_window();
    hide_error_window();
  }
}

void send_message_with_int(AppKey key, int number) {
  // Declare the dictionary's iterator
  DictionaryIterator *out_iter;

  // Prepare the outbox buffer for this message
  AppMessageResult result = app_message_outbox_begin(&out_iter);
  if(result == APP_MSG_OK) {
    // Add message and data
    dict_write_int(out_iter, key, &number, sizeof(number), true);
    // Send this message
    result = app_message_outbox_send();
    if(result != APP_MSG_OK) {
      APP_LOG(APP_LOG_LEVEL_ERROR, "Error sending the outbox: %d", (int)result);
    }
  } else {
    // The outbox cannot be used right now
    APP_LOG(APP_LOG_LEVEL_ERROR, "Error preparing the outbox: %d", (int)result);
  }
}