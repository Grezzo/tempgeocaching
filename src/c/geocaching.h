#pragma once

#define KEY_LEN 6 //e.g. (GC)2JP83_
#define NAME_LEN 60 //Any longer than 60 (59) chars in a title is stupid; it will be truncated
#define DIST_STRING_LEN 12 //e.g: 999.99mi NE_

typedef struct{
  char key[KEY_LEN];
  char name[NAME_LEN];
  char distance_as_string[DIST_STRING_LEN];
} Geocache;

// Called by app_message
void process_batch_of_geocaches(int num_caches, char *serialised_geocaches);

// Called by menu_window
Geocache get_geocache(int index);
int get_number_of_geocaches();