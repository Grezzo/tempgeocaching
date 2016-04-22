/*TODO:
display direction to geocache
add calibration from compass
check whether Peter can get it working on Android (works for me on 4.2.2)
change start/error/status/menu window closing to "pop all"" and destroy windows etc in unload
does app still sometimes get stale location data?
make back button cancel current operation and go back to list of geocaches (if it had loaded one).
clear status window text buffers on load (sometimes shows old status - how is that even possible?!)
learn about pebble floating point - done - check any new files for floats and fix them!
set app message buffers to a more reasonable size
Implement retry for app messages (in both C and JS)
Work out what a good timeout might be
use slate for config
only log in if necesarry. cookie lasts one month!
only get session token if necesarry (not sure how long that lasts)
filter by type of geocache
Ability to reorder list by current location or name without re-searching
get next 100 results in menu window (if search results found more than 100!)
Ability to save list for location
Ability to post a found log (maybe using Mic or canned messages)
*/

/*globals require, module*/ //Stop complaining about require and modules being undefined

var config = require('config');

module.exports.getGeocaches = getGeocaches;
module.exports.serializeGeocaches = serializeGeocaches;
module.exports.loadCaches = loadCaches;

var base64 = require('base64_encode');
var location = require('location');

var timeout = 30000;

// Global variables used to store current location
var lat;
var lng;

// Maximum number of geocaches to send to watch
var maxNumCaches = 100;

function loadCaches() {
  var serializedGeocaches = localStorage.getItem('geocaches');
  if (serializedGeocaches) {
    var numOfCaches = JSON.parse(localStorage.getItem('numOfCaches'));
    console.log("Got saved geocaches");
    // Send to watch
    console.log('Sending geocaches to watch. Message size: ' + serializedGeocaches.length + ' + 8');
    Pebble.sendAppMessage({
      'AppKeyGeocaches': serializedGeocaches,
      'AppKeyNumCaches': numOfCaches
    });
  } else {
    console.log("No saved geocaches, so will get them");
    // There are no saved geocaches, so get them
    getGeocaches();
  }
}

function getGeocaches() {
  var accuracy = 10;
  // Emulator never gets more accurate than 1000, so lower accuracy
  if ((Pebble.getActiveWatchInfo().model.indexOf("qemu_platform_") != -1)) {
    console.log('Detected emulator in use, decreasing GPS accuracy');
    accuracy = 1000;
  }

  Pebble.sendAppMessage({
    'AppKeyStatusDesc': "Getting location\n±" +
    location.distanceAsString(accuracy, config.getConfig('metric')),
    'AppKeyStatusProgress': 0,
    'AppKeyStatusStage': 1
  });

  var locationWatcher = navigator.geolocation.watchPosition(
    function success(position) {
      Pebble.sendAppMessage({
        'AppKeyStatusDesc': "Getting location\n±" +
        location.distanceAsString(accuracy, config.getConfig('metric')) +
        "\n(GPS: ±" +
        location.distanceAsString(position.coords.accuracy, config.getConfig('metric')) +
        ")",
        'AppKeyStatusProgress': 0,
        'AppKeyStatusStage': 1
      });

      if (
        position.coords.accuracy <= accuracy && // Require accuracy
        position.timestamp - Date.now() < 5000 // And recent location
      ) {
        navigator.geolocation.clearWatch(locationWatcher);
        console.log("Location accuracy (" + position.coords.accuracy + "m) is good");
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        console.log("Searching at coords: " + lat, lng);
        logIn();
      } else {
        console.log("Location accuracy (" + position.coords.accuracy + "m) not good enough yet");
      }
    },
    function error(error) {
      navigator.geolocation.clearWatch(locationWatcher);
      console.log(JSON.stringify(error));
      Pebble.sendAppMessage({'AppKeyStatusError': "Can't get location.\nCheck phone settings"});
    }
  );
}


function logIn() {
  Pebble.sendAppMessage({
          'AppKeyStatusDesc': "Logging In",
          'AppKeyStatusProgress': 0,
          'AppKeyStatusStage': 2
        });
  var xhr = new XMLHttpRequest();
  xhr.ontimeout = function() {
    Pebble.sendAppMessage({'AppKeyStatusError': "Timeout while logging in"});
  };
  xhr.onerror = function() {
    Pebble.sendAppMessage({'AppKeyStatusError': "Error logging in"});
  };
  xhr.onprogress = function(event) {
    if (event.lengthComputable) {
      var percentComplete = Math.round((event.loaded / event.total) * 100);
      // Only send message if not complete, otherwise let onload deal with it
      if (percentComplete != 100) {
        Pebble.sendAppMessage({
          'AppKeyStatusDesc': "Logging In",
          'AppKeyStatusProgress': percentComplete,
          'AppKeyStatusStage': 2
        });
      }
    }
  };
  xhr.onload = function() {
    var match = xhr.responseText.match(
      /<span id="ctl00_ContentBody_lbUsername">You are signed in as <strong>([^<]+)<\/strong><\/span>/
    );
    if (match) {
      if (caseInsensitiveCompare(htmlUnescape(config.getConfig('username')), match[1])) {
        // Logged in as correct user
        getMapSessionToken();
      } else {
        // Will still be signed in as previous user if login failed
        Pebble.sendAppMessage({'AppKeyStatusError': "Login Rejected.\nCheck settings"});
      }
    } else {
      // Will only occur if invalid credentials and (previous log in has expired, or was never logged in)
      Pebble.sendAppMessage({'AppKeyStatusError': "Login Rejected.\nCheck settings"});
    }
  };
  xhr.timeout = timeout;
  xhr.open("POST", "https://www.geocaching.com/login/default.aspx");
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhr.send("__EVENTTARGET=&__EVENTARGUMENT=" +
           "&ctl00%24ContentBody%24tbUsername=" + encodeURIComponent(config.getConfig('username')) +
           "&ctl00%24ContentBody%24tbPassword=" + encodeURIComponent(config.getConfig('password')) + 
           "&ctl00%24ContentBody%24cbRememberMe=on&ctl00%24ContentBody%24btnSignIn=Sign+In");
}



function getMapSessionToken() {
  Pebble.sendAppMessage({
          'AppKeyStatusDesc': "Getting Session Token",
          'AppKeyStatusProgress': 0,
          'AppKeyStatusStage': 3
        });
  var xhr = new XMLHttpRequest();
  xhr.ontimeout = function() {
    Pebble.sendAppMessage({'AppKeyStatusError': "Timeout getting session token"});
  };
  xhr.onerror = function() {
    Pebble.sendAppMessage({'AppKeyStatusError': "Error getting session token"});
  };
  xhr.onprogress = function(event) {
    if (event.lengthComputable) {
      var percentComplete = Math.round((event.loaded / event.total) * 100);
      // Only send message if not complete, otherwise let onload deal with it
      if (percentComplete != 100) {
        Pebble.sendAppMessage({
          'AppKeyStatusDesc': "Getting Session Token",
          'AppKeyStatusProgress': percentComplete,
          'AppKeyStatusStage': 3
        });
      }
    }
  };
  xhr.onload = function() {
    var match = xhr.responseText.match(/sessionToken:'([^']*)'/);
    if (match) {
      var sessionToken = match[1];
      getJSONData(sessionToken);
    } else {
      Pebble.sendAppMessage({'AppKeyStatusError': "Error parsing session token"});
    }
  };
  xhr.timeout = timeout;
  xhr.open("GET", "https://www.geocaching.com/map/default.aspx?lat=" + lat + "&lng=" + lng);
  xhr.send();
}

function getJSONData(sessionToken) {
  Pebble.sendAppMessage({
          'AppKeyStatusDesc': "Getting Geocaches",
          'AppKeyStatusProgress': 0,
          'AppKeyStatusStage': 4
        });
  
  var unit = config.getConfig('metric') ? "km" : "mi";
  var filterData = base64.btoa("origin=" + lat + "," + lng + "&radius=" + config.getConfig('search_radius') + unit);
  var xhr = new XMLHttpRequest();
  xhr.ontimeout = function() {
    Pebble.sendAppMessage({'AppKeyStatusError': "Timeout getting geocaches"});
  };
  xhr.onerror = function() {
    Pebble.sendAppMessage({'AppKeyStatusError': "Error getting geocaches"});
  };
  xhr.onprogress = function(event) {
    if (event.lengthComputable) {
      var percentComplete = Math.round((event.loaded / event.total) * 100);
      // Only send message if not complete, otherwise let onload deal with it
      if (percentComplete != 100) {
        Pebble.sendAppMessage({
          'AppKeyStatusDesc': "Getting Geocaches",
          'AppKeyStatusProgress': percentComplete,
          'AppKeyStatusStage': 4
        });
      }
    }
  };
  xhr.onload = function() {
    try {
      var JSONObject = JSON.parse(xhr.responseText);
      parseJSONObject(JSONObject);
    } catch(error) {
      Pebble.sendAppMessage({'AppKeyStatusError': "Error parsing geocaches"});
    }
  };
  xhr.timeout = timeout;
  xhr.open("GET", "https://tiles01.geocaching.com/map.as?filterData=" + filterData + "&st=" + sessionToken);
  xhr.send();
}

function parseJSONObject(JSONObject) {
  Pebble.sendAppMessage({
    'AppKeyStatusDesc': "Parsing Geocaches",
    'AppKeyStatusProgress': 0,
    'AppKeyStatusStage': 5
  });
  // Make new array of geocache objects including only necesarry details
  var geocaches = [];
  var sentPercent = 0;
  JSONObject.data.layer.features.forEach(function(feature, index) {
    var percentComplete = Math.round((index / JSONObject.data.layer.features.length) * 10) * 10;
    if (percentComplete != sentPercent) {
      Pebble.sendAppMessage({
        'AppKeyStatusDesc': "Parsing Geocaches",
        'AppKeyStatusProgress': percentComplete,
        'AppKeyStatusStage': 5
      });
      sentPercent = percentComplete;
    }
    // Don't include found geocaches if filter applied, or disabled geocaches
    if (
      !((feature.properties.icon === "MyFind") && !config.getConfig('show_found')) &&
      feature.properties.available
    ) {
      var distanceAndBearing = location.distanceAndBearing(lat, lng, feature.properties.lat, feature.properties.lng);
      var distanceAndDirection = location.distanceAsString(distanceAndBearing.distance, config.getConfig('metric')) +
          " " + distanceAndBearing.direction;
      geocaches.push({
        distanceInM: distanceAndBearing.distance,
        distanceAsString: distanceAndDirection,
        lat: feature.properties.lat,
        lng: feature.properties.lng,
        key: feature.properties.key,
        name: feature.properties.name,
      });
    }
  });
  console.log("Got " + geocaches.length + " geocaches");
  
  // Sort array by distance
  geocaches.sort(function sort(a,b) {
    return a.distanceInM - b.distanceInM;
  });
  
  // Drop all but the first 100
  geocaches.splice(maxNumCaches);
  var serializedGeocaches = serializeGeocaches(geocaches);
  
  // Save geocaches for next load
  localStorage.setItem('geocaches', serializedGeocaches);
  localStorage.setItem('numOfCaches', JSON.stringify(geocaches.length));
  
  // Send to watch
  console.log('Sending geocaches to watch. Message size: ' + serializedGeocaches.length + ' + 8');
  Pebble.sendAppMessage({
    'AppKeyGeocaches': serializedGeocaches,
    'AppKeyNumCaches': geocaches.length
  });
}

function serializeGeocaches(geocaches) {
  var serializedGeocaches = "";
  geocaches.forEach(function(geocache) {
    serializedGeocaches +=
      geocache.distanceAsString + String.fromCharCode(30) +
      geocache.name.substring(0, 59) + String.fromCharCode(30) + // Trim name to 59 characters because that's the size of the buffer on the watch
      geocache.key.substring(2) + String.fromCharCode(31); // Remove "GC" from the beginning of the key as it is always "GC"
  });
  return serializedGeocaches;
}

function caseInsensitiveCompare(str1, str2) {
  return (str1.toUpperCase() === str2.toUpperCase());
}

function htmlUnescape(string) {    
  string = string.replace(/&amp;/g, "&");
  string = string.replace(/&#39;/g, "'");
  string = string.replace(/&lt;/g, "<");
  string = string.replace(/&gt;/g, ">");
  string = string.replace(/&quot;/g, "\"");
  // Could do this better. especially with numbered entities.
  return string;
}
