#include "datetime_layer.h"

typedef struct {
  GColor background_color;
  GColor text_color;
  bool draw_separator;
} DateTimeLayerProperties;

static void get_datetime_string(char *datetime_buffer, size_t n) {
  // Get a tm structure
  time_t temp = time(NULL);
  struct tm *tick_time = localtime(&temp);

  // Write the current hours and minutes into a buffer
  char time_buffer[6];
  strftime(
    time_buffer,
    sizeof(time_buffer),
    clock_is_24h_style() ? "%R" : "%l:%M",
    tick_time
  );
  // Write the current date into a buffer
  char date_buffer[11];
  char* date_ptr = date_buffer;
  strftime(
    date_buffer,
    sizeof(date_buffer),
    "%d %b",
    tick_time
  );
  // Strip leading 0 from date
  if (date_buffer[0] == '0') {
    date_ptr++;
  }
  // Construct string
  snprintf(datetime_buffer, n, "%s - %s", time_buffer, date_ptr);
}

static void datetime_layer_update_proc(struct Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_frame(layer);
  DateTimeLayerProperties* properties = (DateTimeLayerProperties*) layer_get_data(layer);
  graphics_context_set_text_color(ctx, properties->text_color);
  graphics_context_set_fill_color(ctx, properties->background_color);
  graphics_context_set_stroke_color(ctx, properties->text_color);
    
  graphics_fill_rect(ctx, bounds, 0, 0);
  
  if (properties->draw_separator) {
    graphics_draw_line(ctx, GPoint(
      bounds.origin.x,
      bounds.size.h-1
    ), GPoint(
      bounds.size.w,
      bounds.size.h-1
    ));
  }
  
  GTextAttributes *text_attributes = graphics_text_attributes_create();
  graphics_text_attributes_enable_screen_text_flow(text_attributes, 3);
  char datetime_buffer[16];
  get_datetime_string(datetime_buffer, sizeof(datetime_buffer));
  graphics_draw_text(
    ctx,
    datetime_buffer,
    fonts_get_system_font(FONT_KEY_GOTHIC_14),
    GRect(
      bounds.origin.x,
      PBL_IF_RECT_ELSE(
        bounds.origin.y - 2,
        bounds.origin.y + 6
      ),
      bounds.size.w,
      bounds.size.h
    ),
    GTextOverflowModeTrailingEllipsis,
    GTextAlignmentCenter,
    text_attributes
  );
  graphics_text_attributes_destroy(text_attributes);
}

DateTimeLayer *datetime_layer_create(GRect frame, GColor background_color, GColor text_color, bool draw_separator) {
  DateTimeLayer *datetime_layer = layer_create_with_data(frame, sizeof(DateTimeLayerProperties));

  DateTimeLayerProperties* properties = (DateTimeLayerProperties*) layer_get_data(datetime_layer);
  properties->background_color = background_color;
  properties->text_color = text_color;
  properties->draw_separator = draw_separator;

  layer_set_update_proc(datetime_layer, datetime_layer_update_proc);

  return datetime_layer;
}

void datetime_layer_destroy(DateTimeLayer *datetime_layer) {
  layer_destroy(datetime_layer);
}
