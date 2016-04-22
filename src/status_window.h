#pragma once

#define PROGRESS_LAYER_WINDOW_WIDTH 80

void show_status_window(void);
void hide_status_window(void);

void update_status_window(char *description, int stage, int progress);
void show_error(char *error);