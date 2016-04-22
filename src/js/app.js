/*globals require*/ //Stop complaining about require being undefined!

var gc = require('geocaching');
var config = require('config');

Pebble.addEventListener('showConfiguration', config.showConfigWindow);
Pebble.addEventListener('webviewclosed', config.processConfig);

Pebble.addEventListener('ready', function() {
  if (localStorage.getItem('config')) {
    Pebble.sendAppMessage({'AppKeyConfigured': true});
    // Configured, so time to get geocaches
    gc.loadCaches();
  } else {
    Pebble.sendAppMessage({'AppKeyConfigured': false});
  }
});

Pebble.addEventListener('appmessage', function(event) {
  // Get the dictionary from the message
  var dict = event.payload;
  console.log('Got message: ' + JSON.stringify(dict));
  if('AppKeyGetCaches' in dict) {
    gc.getGeocaches();
  } else if ('AppKeyStartNav' in dict) {
    //start sending updates to watch
  } else if ('AppKeyStopNav' in dict) {
    //stop sending updates to watch
  }
});

// Uncomment to clear saved settings (i.e. a virgin installation, except for cookies)
// localStorage.removeItem('config');
// localStorage.removeItem('geocaches');
// localStorage.removeItem('numOfCaches');
