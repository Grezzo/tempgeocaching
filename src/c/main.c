#include <pebble.h>
#include "app_message.h"
#include "start_window.h"
#include "menu_window.h"
#include "error_window.h"

int main(void) {
  show_start_window();

  // Set up AppMessage
  app_message_register_inbox_received(inbox_received_handler);
  app_message_register_inbox_dropped(inbox_dropped_handler);
  // - Messages to phone are only ever integers, as the Key is the important instruction
  // - Messages to watch will hopefully fit in 5500. It is maximum 100 caches,
  //     with sizes from geocaching.h, except the average name length will hopefully be less
  //     than 37 characters (incuding terminator). (6+12+37)*100=5500
  
  //I'VE HAD TO UP THIS BY 1000 OTHERWISE SERIALIZED CACHES ARE DROPPED - NOT SURE WHY YET..., and it's down again now
  //halved because api only returns 50
  // AND BACK UP AGAIN by 250!!!
  app_message_open(3000, APP_MESSAGE_OUTBOX_SIZE_MINIMUM);
  
  app_event_loop();
  
  hide_menu_window();

}
