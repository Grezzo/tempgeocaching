#include <pebble.h>
#include "start_window.h"

static Window *s_window;
static StatusBarLayer * s_status_bar_layer;
static GBitmap *s_geocache_bitmap;
static BitmapLayer *s_bitmap_layer;
static TextLayer *s_text_layer;

static void load_handler(Window* window) {
  Layer *root_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root_layer);
  
  // Status Bar
  s_status_bar_layer = status_bar_layer_create();
  layer_add_child(root_layer, status_bar_layer_get_layer(s_status_bar_layer));

  // Bitmap Layer
  s_bitmap_layer = bitmap_layer_create(GRect(
    bounds.origin.x,
    bounds.origin.y + STATUS_BAR_LAYER_HEIGHT,
    bounds.size.w,
    104
  ));
  s_geocache_bitmap = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_LARGE_LOGO);
  bitmap_layer_set_bitmap(s_bitmap_layer, s_geocache_bitmap);
  layer_add_child(root_layer, bitmap_layer_get_layer(s_bitmap_layer));
  
  // Text layer
  s_text_layer = text_layer_create(GRect(
    bounds.origin.x,
    bounds.origin.y + STATUS_BAR_LAYER_HEIGHT + 104,
    bounds.size.w,
    bounds.size.h - STATUS_BAR_LAYER_HEIGHT - 104
  ));
  text_layer_set_font(s_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text_alignment(s_text_layer, GTextAlignmentCenter);
  text_layer_set_text(s_text_layer, "Connecting to Phone");
  
  layer_add_child(root_layer, text_layer_get_layer(s_text_layer));
  text_layer_enable_screen_text_flow_and_paging(s_text_layer, 5);
  
  #if defined(PBL_COLOR)
  window_set_background_color(window, GColorDarkGreen);
  status_bar_layer_set_colors(s_status_bar_layer, GColorClear, GColorWhite);
  status_bar_layer_set_separator_mode(s_status_bar_layer, StatusBarLayerSeparatorModeDotted);
  text_layer_set_background_color(s_text_layer, GColorClear);
  text_layer_set_text_color(s_text_layer, GColorWhite);
  #endif
}

static void unload_handler(Window* window) {
  status_bar_layer_destroy(s_status_bar_layer);
  gbitmap_destroy(s_geocache_bitmap);
  bitmap_layer_destroy(s_bitmap_layer);
  text_layer_destroy(s_text_layer);
}

void show_start_window(void) {
  if (!window_stack_contains_window(s_window)) {
    s_window = window_create();
    window_set_window_handlers(s_window, (WindowHandlers) {
      .load = load_handler,
      .unload = unload_handler,
    });
    window_stack_push(s_window, false);
  }
}

void hide_start_window(void) {
  if (window_stack_contains_window(s_window)) {
    window_stack_remove(s_window, false);
    window_destroy(s_window);
    s_window = NULL;
  }
}

void update_start_window_message(char *message) {
  text_layer_set_text(s_text_layer, message);
}
