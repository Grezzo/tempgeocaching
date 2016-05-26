#include <pebble.h>
#include "menu_window.h"
#include "geocaching.h"
#include "app_message.h"
#include "status_window.h"
#include "error_window.h"
#include "cache_window.h"

#define TITLE_FONT FONT_KEY_GOTHIC_24_BOLD
#define SUBTITLE_FONT FONT_KEY_GOTHIC_18

static Window *s_window;
static StatusBarLayer *s_status_bar_layer;
static MenuLayer *s_menu_layer;
static GBitmap *s_cloud_bitmap;

static void select_click_handler(struct MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context) {
  int row = cell_index->row;
  if (row == 0) {
    // Change window straight away because relying on message from JS may take a second or so
    hide_error_window();
    show_status_window();
    send_message_with_int(AppKeyGetCaches, 0);
  } else {
    show_cache_window(row - 1);
  }
}

static uint16_t get_num_rows_callback(struct MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
  // Return number of geocaches + reload row
  return get_number_of_geocaches() + 1;
}

static void draw_row_callback(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index, void *callback_context) {
  int row = cell_index->row;
  if (row == 0) {
   menu_cell_basic_draw(ctx, cell_layer, "Refresh", "Reload from web", s_cloud_bitmap);
  } else {
    Geocache geocache = get_geocache(row - 1);
    char subtitle[50];
    snprintf(subtitle, sizeof(subtitle), "GC%s - %s", geocache.key, geocache.distance_as_string);
    GRect bounds = layer_get_bounds(cell_layer);
    #ifdef PBL_ROUND
    if (!menu_layer_is_index_selected(s_menu_layer, cell_index)) {
      menu_cell_basic_draw(ctx,
                         cell_layer,
                         geocache.name,
                         subtitle,
                         NULL);
      return;
    }
    GTextAttributes *attributes = graphics_text_attributes_create();
    graphics_text_attributes_enable_screen_text_flow(attributes, 3);
    GTextAlignment alignment = GTextAlignmentCenter;
    #else
    GTextAttributes *attributes = NULL;
    GTextAlignment alignment = GTextAlignmentLeft;
    #endif
    
    GRect title_box = GRect(3, -5, bounds.size.w - 6, bounds.size.h - 17);
    graphics_draw_text(ctx, geocache.name, fonts_get_system_font(TITLE_FONT), title_box, GTextOverflowModeWordWrap, alignment, attributes);
    GRect subtitle_box = GRect(3, bounds.size.h - 23 , bounds.size.w - 6, 23);
    graphics_draw_text(ctx, subtitle, fonts_get_system_font(SUBTITLE_FONT), subtitle_box, GTextOverflowModeWordWrap, alignment, attributes);

    #ifdef PBL_ROUND
    graphics_text_attributes_destroy(attributes);
    #endif
  }
}


static int16_t get_cell_height_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context) {
  #ifdef PBL_ROUND
  if (menu_layer_is_index_selected(menu_layer, cell_index)) {
    return MENU_CELL_ROUND_FOCUSED_TALL_CELL_HEIGHT;
  } else {
    return MENU_CELL_ROUND_UNFOCUSED_TALL_CELL_HEIGHT;
  }
  #else
  int row = cell_index->row;
  if (row == 0) {
    return 44;
  } else {
    Geocache geocache = get_geocache(row - 1);
    char *title = geocache.name;
    GRect bounds = layer_get_bounds(menu_layer_get_layer(menu_layer));
    GRect title_box = GRect(3, 0, bounds.size.w - 6, 100);
    GSize text_size = graphics_text_layout_get_content_size(
      title,
      fonts_get_system_font(TITLE_FONT),
      title_box,
      GTextOverflowModeWordWrap,
      GTextAlignmentLeft
    );
    return text_size.h + 22;
  }
  #endif
}


static void load_handler(Window *window) {
  
  Layer *root_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root_layer);
  
  // Cloud Bitmap
  s_cloud_bitmap = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_CLOUD);
  
  // Status Bar
  s_status_bar_layer = status_bar_layer_create();
  layer_add_child(root_layer, status_bar_layer_get_layer(s_status_bar_layer));
  
  // Menu Layer
  s_menu_layer = menu_layer_create(GRect(bounds.origin.x,
                                        bounds.origin.y + STATUS_BAR_LAYER_HEIGHT,
                                        bounds.size.w,
                                        bounds.size.h - STATUS_BAR_LAYER_HEIGHT));
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks){
    .get_num_rows = get_num_rows_callback,
    .draw_row = draw_row_callback,
    .select_click = select_click_handler,
    .get_cell_height = get_cell_height_callback,
  });
  menu_layer_set_click_config_onto_window(s_menu_layer, s_window);
  layer_add_child(root_layer, menu_layer_get_layer(s_menu_layer));
  // Set second row as focused because first one is to reload
  menu_layer_set_selected_index(s_menu_layer, (MenuIndex){0,1}, MenuRowAlignNone, false);
  
  #if defined(PBL_COLOR)
  window_set_background_color(window, GColorDarkGreen);
  status_bar_layer_set_colors(s_status_bar_layer, GColorClear, GColorWhite);
  status_bar_layer_set_separator_mode(s_status_bar_layer, StatusBarLayerSeparatorModeDotted);
  menu_layer_set_normal_colors(s_menu_layer, GColorDarkGreen, GColorWhite);
  menu_layer_set_highlight_colors(s_menu_layer, GColorKellyGreen, GColorWhite);
  #endif
}

static void unload_handler(Window *window) {
  gbitmap_destroy(s_cloud_bitmap);
  menu_layer_destroy(s_menu_layer);
  status_bar_layer_destroy(s_status_bar_layer);
}

void show_menu_window(void) {
  if (!window_stack_contains_window(s_window)) {
    s_window = window_create();
    window_set_window_handlers(s_window, (WindowHandlers) {
      .load = load_handler,
      .unload = unload_handler,
    });
    window_stack_push(s_window, false);
  }
}

void hide_menu_window(void) {
  if (window_stack_contains_window(s_window)) {
    window_stack_remove(s_window, false);
    window_destroy(s_window);
    s_window = NULL;
  }
}
