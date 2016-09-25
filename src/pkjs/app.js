/*globals require*/ //Stop complaining about require being undefined!

var gc = require('./geocaching.js');
var config = require('./config.js');

Pebble.addEventListener('showConfiguration', config.showConfigWindow);
Pebble.addEventListener('webviewclosed', config.processConfig);

Pebble.addEventListener('ready', function() {
  
  // Get current saved configuration version before it is updated
  var configVer = 0;
  if (localStorage.getItem("config")) {
    configVer = JSON.parse(localStorage.getItem("config")).version;
    if (!configVer) {
      configVer = 1;
    }
  }
  
  // If it's a v2 configuration, get geocaches.
  if (configVer == 2) {
    Pebble.sendAppMessage({'AppKeyConfigured': true});
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
    gc.startNav(dict.AppKeyStartNav);
  } else if ('AppKeyStopNav' in dict) {
    gc.stopNav();
  }
});

// Uncomment to clear saved settings (i.e. a virgin installation, except for cookies)
// localStorage.removeItem('config');
// localStorage.removeItem('authToken');
// localStorage.removeItem('geocaches');
// localStorage.removeItem('numOfCaches');
