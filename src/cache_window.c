#include <pebble.h>
#include "cache_window.h"
#include "app_message.h"

static Geocache s_geocache;

static Window *s_window;
static StatusBarLayer *s_status_bar_layer;
static TextLayer *s_text_layer;

void bearing_and_distance_handler(int bearing, char *distance) {
  //update distance and bearing
  //update ui
}

static void compass_heading_handler(CompassHeadingData heading) {
  //update compass heading
  //update ui
}

static void load_handler(Window* window) {
  
  send_message_with_int(AppKeyStartNav, 0);
  compass_service_subscribe(compass_heading_handler);
  
  Layer *root_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root_layer);

  // Status Bar
  s_status_bar_layer = status_bar_layer_create();
  layer_add_child(root_layer, status_bar_layer_get_layer(s_status_bar_layer));
  
  // Text Layer
  s_text_layer = text_layer_create(GRect(
    bounds.origin.x,
    bounds.origin.y + STATUS_BAR_LAYER_HEIGHT,
    bounds.size.w,
    bounds.size.h - STATUS_BAR_LAYER_HEIGHT
  ));
  text_layer_set_background_color(s_text_layer, GColorClear);
  text_layer_set_text_color(s_text_layer, GColorWhite);
  text_layer_set_text_alignment(s_text_layer, GTextAlignmentCenter);
  text_layer_set_font(s_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD));
  text_layer_enable_screen_text_flow_and_paging(s_text_layer, 5);
  
  text_layer_set_text(s_text_layer, "Getting direction to geocache");
  layer_add_child(root_layer, text_layer_get_layer(s_text_layer));

  #if defined(PBL_COLOR)
  window_set_background_color(window, GColorDarkGreen);
  status_bar_layer_set_colors(s_status_bar_layer, GColorClear, GColorWhite);
  status_bar_layer_set_separator_mode(s_status_bar_layer, StatusBarLayerSeparatorModeDotted);
  #endif
}

static void unload_handler(Window* window) {
  send_message_with_int(AppKeyStopNav, 0);
  compass_service_unsubscribe();
  status_bar_layer_destroy(s_status_bar_layer);
  text_layer_destroy(s_text_layer);
  window_destroy(s_window);
}

void show_cache_window(Geocache geocache) {
  s_geocache = geocache;
  s_window = window_create();
  window_set_window_handlers(s_window, (WindowHandlers) {
    .load = load_handler,
    .unload = unload_handler,
  });
  window_stack_push(s_window, false);
}