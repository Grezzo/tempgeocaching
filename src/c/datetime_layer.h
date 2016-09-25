#pragma once

#include <pebble.h>

typedef struct Layer DateTimeLayer;

DateTimeLayer *datetime_layer_create(GRect frame, GColor background_color, GColor text_color, bool draw_separator);
void datetime_layer_destroy(DateTimeLayer *datetime_layer);
