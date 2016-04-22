#include <pebble.h>
#include "status_window.h"
#include "progress_layer.h"

static Window *s_window;

static StatusBarLayer *s_status_bar_layer;
static TextLayer *s_description_layer;
static ProgressLayer *s_progress_layer;
static TextLayer *s_stage_layer;

static char s_description_buffer[50];
static char s_stage_buffer[15];

static void load_handler(Window* window) {
  Layer *root_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root_layer);
  
  // Status Bar
  s_status_bar_layer = status_bar_layer_create();
  layer_add_child(root_layer, status_bar_layer_get_layer(s_status_bar_layer));
  
  // Description Layer
  s_description_layer = text_layer_create(GRect(
    bounds.origin.x,
    bounds.origin.y + STATUS_BAR_LAYER_HEIGHT,
    bounds.size.w,
    (bounds.size.h - STATUS_BAR_LAYER_HEIGHT) / 2 - 3
  ));
  text_layer_set_text(s_description_layer, s_description_buffer);
  text_layer_set_text_alignment(s_description_layer, GTextAlignmentCenter);
  text_layer_set_font(s_description_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_overflow_mode(s_description_layer, GTextOverflowModeWordWrap);
  layer_add_child(root_layer, text_layer_get_layer(s_description_layer));
  text_layer_enable_screen_text_flow_and_paging(s_description_layer, 5);
  
  // Progress Layer
  s_progress_layer = progress_layer_create(GRect(
    (bounds.size.w - PROGRESS_LAYER_WINDOW_WIDTH) / 2,
    ((bounds.size.h - STATUS_BAR_LAYER_HEIGHT) / 2 + STATUS_BAR_LAYER_HEIGHT - 3),
    PROGRESS_LAYER_WINDOW_WIDTH,
    6
  ));
  progress_layer_set_progress(s_progress_layer, 0);
  progress_layer_set_corner_radius(s_progress_layer, 3);
  layer_add_child(root_layer, s_progress_layer);
  
  // Stage Layer
  s_stage_layer = text_layer_create(GRect(
    bounds.origin.x,
    (bounds.size.h - STATUS_BAR_LAYER_HEIGHT) / 2 + STATUS_BAR_LAYER_HEIGHT + 3,
    bounds.size.w,
    (bounds.size.h - STATUS_BAR_LAYER_HEIGHT) / 2 - 3
  ));
  text_layer_set_text(s_stage_layer, s_stage_buffer);
  text_layer_set_text_alignment(s_stage_layer, GTextAlignmentCenter);
  text_layer_set_font(s_stage_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_overflow_mode(s_stage_layer, GTextOverflowModeWordWrap);
  layer_add_child(root_layer, text_layer_get_layer(s_stage_layer));
  text_layer_enable_screen_text_flow_and_paging(s_stage_layer, 5);
  
  #if defined(PBL_COLOR)
  window_set_background_color(window, GColorDarkGreen);
  
  status_bar_layer_set_colors(s_status_bar_layer, GColorClear, GColorWhite);
  status_bar_layer_set_separator_mode(s_status_bar_layer, StatusBarLayerSeparatorModeDotted);
  
  text_layer_set_background_color(s_description_layer, GColorClear);
  text_layer_set_text_color(s_description_layer, GColorWhite);
  
  progress_layer_set_foreground_color(s_progress_layer, GColorWhite);
  progress_layer_set_background_color(s_progress_layer, GColorKellyGreen);
  
  text_layer_set_background_color(s_stage_layer, GColorClear);
  text_layer_set_text_color(s_stage_layer, GColorWhite);
  #endif
}

static void unload_handler(Window* window) {
  status_bar_layer_destroy(s_status_bar_layer);
  text_layer_destroy(s_description_layer);
  progress_layer_destroy(s_progress_layer);
  text_layer_destroy(s_stage_layer);
}

void show_status_window(void) {
  if (!window_stack_contains_window(s_window)) {
    s_window = window_create();
    window_set_window_handlers(s_window, (WindowHandlers) {
      .load = load_handler,
      .unload = unload_handler,
    });
    window_stack_push(s_window, true);
  }
}

void hide_status_window(void) {
  if (window_stack_contains_window(s_window)) {
    window_stack_remove(s_window, false);
    window_destroy(s_window);
    s_window = NULL;
  }
}

void update_status_window(char *description, int stage, int progress) {
  // Update description
  snprintf(s_description_buffer, sizeof(s_description_buffer), "%s", description);
  layer_mark_dirty(text_layer_get_layer(s_description_layer));
  // Set vertical position of desription layer to be just above progress bar
  GRect bounds = layer_get_bounds(window_get_root_layer(s_window));
  GSize description_size = text_layer_get_content_size(s_description_layer);
  int upper_half = ((bounds.size.h - STATUS_BAR_LAYER_HEIGHT) / 2) - 3; // Area between status and progress bars
  int padding = 6; // Extra padding needed below for "decenders" (e.g. qypgj) and a bit of white space
  layer_set_frame(text_layer_get_layer(s_description_layer), GRect(
    bounds.origin.x,
    upper_half - description_size.h + STATUS_BAR_LAYER_HEIGHT - padding,
    bounds.size.w,
    description_size.h + padding
  ));  
  
  // Update progress bar
  progress_layer_set_progress(s_progress_layer, progress);
  
  // Update stage
  snprintf(s_stage_buffer, sizeof(s_stage_buffer), "Stage %i of 5", stage);
  layer_mark_dirty(text_layer_get_layer(s_stage_layer));
}
