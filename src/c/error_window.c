#include <pebble.h>
#include "error_window.h"
#include "app_message.h"
#include "status_window.h"
#include "datetime_layer.h"

static Window *s_window;

// static StatusBarLayer *s_status_bar_layer;
static DateTimeLayer *s_datetime_layer;

static GBitmap *s_error_bitmap;
static BitmapLayer *s_error_layer;

static GBitmap *s_retry_bitmap;
static BitmapLayer *s_retry_layer;

static TextLayer *s_text_layer;
static char s_error_buffer[50];

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  layer_mark_dirty(s_datetime_layer);
}

static void click_handler(ClickRecognizerRef recognizer, void *context) {
  // Change window straight away because relying on message from JS may take a second or so
  show_status_window();
  hide_error_window();
  send_message_with_int(AppKeyGetCaches, 0);
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, click_handler);
}

static void load_handler(Window* window) {
  
  window_set_click_config_provider(window, click_config_provider);
  
  Layer *root_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root_layer);
  
  // Status Bar
//   s_status_bar_layer = status_bar_layer_create();
//   layer_add_child(root_layer, status_bar_layer_get_layer(s_status_bar_layer));
  s_datetime_layer = datetime_layer_create(
    GRect(
      bounds.origin.x,
      bounds.origin.y,
      bounds.size.w,
      STATUS_BAR_LAYER_HEIGHT
    ),
    PBL_IF_COLOR_ELSE(GColorDarkGreen, GColorBlack),
    GColorWhite,
    PBL_IF_COLOR_ELSE(true, false)
  );
  layer_add_child(root_layer, s_datetime_layer);
  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);

  // Retry bitmap Layer
  s_retry_layer = bitmap_layer_create(GRect(
    bounds.size.w - 20,
    (bounds.size.h / 2) - 7,
    17,
    15
  ));
  s_retry_bitmap = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_RETRY_ICON);
  bitmap_layer_set_bitmap(s_retry_layer, s_retry_bitmap);
  layer_add_child(root_layer, bitmap_layer_get_layer(s_retry_layer));
  
  // Error bitmap Layer
  s_error_layer = bitmap_layer_create(GRect(
    bounds.origin.x + 23,
    bounds.origin.y + STATUS_BAR_LAYER_HEIGHT + 5,
    bounds.size.w - 46,
    76
  ));
  s_error_bitmap = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_ERROR_ICON);
  bitmap_layer_set_bitmap(s_error_layer, s_error_bitmap);
  layer_add_child(root_layer, bitmap_layer_get_layer(s_error_layer));
  
  // Text layer
  s_text_layer = text_layer_create(GRect(
    bounds.origin.x,
    bounds.origin.y + STATUS_BAR_LAYER_HEIGHT + 86,
    bounds.size.w,
    bounds.size.h - STATUS_BAR_LAYER_HEIGHT - 86
  ));
  text_layer_set_font(s_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text_alignment(s_text_layer, GTextAlignmentCenter);
  text_layer_set_text(s_text_layer, s_error_buffer);
  layer_add_child(root_layer, text_layer_get_layer(s_text_layer));
  text_layer_enable_screen_text_flow_and_paging(s_text_layer, 5);
  
  #if defined(PBL_COLOR)
  window_set_background_color(window, GColorRed);
//   status_bar_layer_set_colors(s_status_bar_layer, GColorClear, GColorWhite);
//   status_bar_layer_set_separator_mode(s_status_bar_layer, StatusBarLayerSeparatorModeDotted);
  text_layer_set_background_color(s_text_layer, GColorClear);
  text_layer_set_text_color(s_text_layer, GColorWhite);
  #endif
}

static void unload_handler(Window* window) {
//   status_bar_layer_destroy(s_status_bar_layer);
  tick_timer_service_unsubscribe();
  datetime_layer_destroy(s_datetime_layer);
  gbitmap_destroy(s_error_bitmap);
  bitmap_layer_destroy(s_error_layer);
  gbitmap_destroy(s_retry_bitmap);
  bitmap_layer_destroy(s_retry_layer);
  text_layer_destroy(s_text_layer);
}

void show_error_window(char *error) {
  snprintf(s_error_buffer, sizeof(s_error_buffer), "%s", error);
  if (!window_stack_contains_window(s_window)) {
    s_window = window_create();
    window_set_window_handlers(s_window, (WindowHandlers) {
      .load = load_handler,
      .unload = unload_handler,
    });
    window_stack_push(s_window, false);
  }
}

void hide_error_window(void) {
  if (window_stack_contains_window(s_window)) {
    window_stack_remove(s_window, false);
    window_destroy(s_window);
    s_window = NULL;
  }
}