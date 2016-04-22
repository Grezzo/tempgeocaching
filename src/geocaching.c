#include <pebble.h>
#include "geocaching.h"
#include "app_message.h"

static int s_num_of_caches = 0;
static Geocache s_geocaches[100];

Geocache get_geocache(int index) {
  return s_geocaches[index];
}

int get_number_of_geocaches() {
  return s_num_of_caches;
}

// Splits a string at a delimiter. Returns first token and advances source pointer to start of next token
// Inspired by fugounashi on pebble forums: 
//   https://forums.getpebble.com/discussion/comment/64597/#Comment_64597
static char *getToken(char **source, char delim) {
  //Set token to start of string
  char *token = *source;
  //Skip original string forwards to delim
  while (**source != delim && **source != 0) ++*source;
  //Replace delim with null so token stops there
  **source = '\0';
  //Advance original string past null to beginning of next token
  ++*source;
  //return token
  return token;
}

void process_batch_of_geocaches(int num_caches, char *serialised_geocaches) {
  s_num_of_caches = num_caches;
  
  for (int i = 0; i < num_caches; i++) {
    char *geocache = getToken(&serialised_geocaches, (char)31);
    snprintf(s_geocaches[i].distance_as_string, DIST_STRING_LEN, "%s", getToken(&geocache, (char)30));
    snprintf(s_geocaches[i].name, NAME_LEN, "%s", getToken(&geocache, (char)30));
    snprintf(s_geocaches[i].key, KEY_LEN, "%s", geocache);
  }
}