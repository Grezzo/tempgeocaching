#include <pebble.h>
#include "cache_window.h"
#include "app_message.h"
#include "arrow_layer.h"
#include "datetime_layer.h"

static int s_cache_index;
static CompassHeading s_compass_heading;
static int s_bearing;
static char s_distance_buffer[20];

static bool s_has_heading;
static bool s_has_bearing;

static Window *s_window;
// static StatusBarLayer *s_status_bar_layer;
static DateTimeLayer *s_datetime_layer;
static ArrowLayer *s_arrow_layer;
static TextLayer *s_calibration_layer;
static TextLayer *s_distance_layer;

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  layer_mark_dirty(s_datetime_layer);
}

static void update_arrow() {
  int direction = (s_bearing + s_compass_heading) % TRIG_MAX_ANGLE;
  arrow_layer_set_angle(s_arrow_layer, direction);
}

void bearing_and_distance_handler(int bearing, char *distance) {
  snprintf(s_distance_buffer, sizeof(s_distance_buffer), "%s", distance);
  text_layer_set_text(s_distance_layer, s_distance_buffer);
  //WHY DO I HAVE TO SET_TEXT RATHER THAN JUST MARK DIRTY??
  //layer_mark_dirty(text_layer_get_layer(s_text_layer));
  s_bearing = bearing;
  s_has_bearing = true;
  if (s_has_heading) {
    update_arrow();
  }
}

static void compass_heading_handler(CompassHeadingData heading) {
  if (heading.compass_status == CompassStatusDataInvalid) {
    text_layer_set_text(s_calibration_layer, "Compass is calibrating, move watch around.");
    layer_set_hidden(s_arrow_layer, true);
    layer_set_hidden(text_layer_get_layer(s_calibration_layer), false);
// Message about tuning removed because it is returning data, it's just being refined
// IN FUTURE PUT UP AN INDICATOR THAT IT IS STILL REFINING/TUNING
//   } else if (heading.compass_status == CompassStatusCalibrating) {
//     text_layer_set_text(s_calibration_layer, "Compass is tuning, move watch around.");
//     layer_set_hidden(s_arrow_layer, true);
//     layer_set_hidden(text_layer_get_layer(s_calibration_layer), false);
  } else {
    s_compass_heading = heading.true_heading;
    s_has_heading = true;
    if(s_has_bearing) {
      layer_set_hidden(text_layer_get_layer(s_calibration_layer), true);
      layer_set_hidden(s_arrow_layer, false);
      update_arrow();
    }
  }
}

//Accelerometor dummy handler to work around the compass bug in the v4 firmware
static void accel_data_handler(AccelData *data, uint32_t num_samples) { /* do nothing */}

static void load_handler(Window* window) {
  
  s_has_heading = false;
  s_has_bearing = false;
  
  send_message_with_int(AppKeyStartNav, s_cache_index);
  //subscribe to accelerometer to work around the compass bug in the v4 firmware
  accel_data_service_subscribe(0, accel_data_handler);
  compass_service_subscribe(compass_heading_handler);

  
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
  
  GRect middle_rect = GRect(
      bounds.origin.x,
      bounds.origin.y + STATUS_BAR_LAYER_HEIGHT,
      bounds.size.w,
      100
    );
  
  // Arrow Layer
  s_arrow_layer = arrow_layer_create(
    middle_rect,
    0,
    GColorBlack,
    true,
    0);
  layer_add_child(root_layer, s_arrow_layer);
  layer_set_hidden(s_arrow_layer, true);
  
  // Calibration Layer
  s_calibration_layer = text_layer_create(middle_rect);
  text_layer_set_text_alignment(s_calibration_layer, GTextAlignmentCenter);
  text_layer_set_font(s_calibration_layer, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD));
  layer_add_child(root_layer, text_layer_get_layer(s_calibration_layer));
  text_layer_enable_screen_text_flow_and_paging(s_calibration_layer, 5);
  layer_set_hidden(text_layer_get_layer(s_calibration_layer), true);
  
  // Distance Layer
  s_distance_layer = text_layer_create(GRect(
    bounds.origin.x,
    bounds.origin.y + STATUS_BAR_LAYER_HEIGHT + 100,
    bounds.size.w,
    bounds.size.h - STATUS_BAR_LAYER_HEIGHT - 100
  ));
  text_layer_set_text_alignment(s_distance_layer, GTextAlignmentCenter);
  text_layer_set_font(s_distance_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  s_distance_buffer[0] = 0; // Clear buffer
  text_layer_set_text(s_distance_layer, s_distance_buffer);
  layer_add_child(root_layer, text_layer_get_layer(s_distance_layer));
  text_layer_enable_screen_text_flow_and_paging(s_distance_layer, 5);

  #if defined(PBL_COLOR)
  window_set_background_color(window, GColorDarkGreen);
//   status_bar_layer_set_colors(s_status_bar_layer, GColorClear, GColorWhite);
//   status_bar_layer_set_separator_mode(s_status_bar_layer, StatusBarLayerSeparatorModeDotted);
  arrow_layer_set_color(s_arrow_layer, GColorWhite);
  text_layer_set_background_color(s_calibration_layer, GColorClear);
  text_layer_set_text_color(s_calibration_layer, GColorWhite);
  text_layer_set_background_color(s_distance_layer, GColorClear);
  text_layer_set_text_color(s_distance_layer, GColorWhite);
  #endif
}

static void unload_handler(Window* window) {
  send_message_with_int(AppKeyStopNav, 0);
  compass_service_unsubscribe();
//   status_bar_layer_destroy(s_status_bar_layer);
  tick_timer_service_unsubscribe();
  datetime_layer_destroy(s_datetime_layer);
  arrow_layer_destroy(s_arrow_layer);
  text_layer_destroy(s_calibration_layer);
  text_layer_destroy(s_distance_layer);
  window_destroy(s_window);
}

void show_cache_window(int cache_index) {
  s_cache_index = cache_index;
  s_window = window_create();
  window_set_window_handlers(s_window, (WindowHandlers) {
    .load = load_handler,
    .unload = unload_handler,
  });
  window_stack_push(s_window, false);
}