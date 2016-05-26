/*TODO:
New feature: Now uses corrected coords!
change buffers as only 50 geocaches now
date in status bar
location watcher gets stuck? sense and restart?
Some cachacters aren't displaying properly, like CG2K9QX
Make direction window have text when initally loaded, rather than be just blank
there are 6 character GC codes
option to use feet instead of yards
when compass calibrating, still show distance
when compass tuning, still show arrow (and distance)
vibrate when close to cache
vibrate when loaded search results
make it so that button press gets caches with current accuracy
detect capcha and tell user in error message (search for "recaptcha" in responseText)
add calibration from compass
use script from http://www.geosats.com/js/WorldMagneticModel.js for declination
change start/error/status/menu window closing to "pop all" and destroy windows etc in unload
does app still sometimes get stale location data?
make back button cancel current operation and go back to list of geocaches (if it had loaded one).
clear status window text buffers on load (sometimes shows old status - how is that even possible?!)
learn about pebble floating point - done - check any new files for floats and fix them!
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
Get rid of start window (only really need status window)
*/

/*globals require, module*/ //Stop complaining about require and modules being undefined

var config = require('config');

module.exports.getGeocaches = getGeocaches;
module.exports.loadCaches = loadCaches;
module.exports.startNav = startNav;
module.exports.stopNav = stopNav;

// var base64 = require('base64_encode');
var location = require('location');

var timeout = 30000;

var locationWatcher;

// Global variable used to store list of geocaches
var geocaches;

// Global variables used to store current location
var lat;
var lng;

// Maximum number of geocaches to send to watch
//var maxNumCaches = 100;

function loadCaches() {
  geocaches = JSON.parse(localStorage.getItem('geocaches'));
  if (geocaches) {
    console.log("Got saved geocaches");
    sendGeocaches();
  } else {
    console.log("No saved geocaches, so will get them");
    // There are no saved geocaches, so get them
    getGeocaches();
  }
}

function getGeocaches() {
  var accuracy = 50;
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

  locationWatcher = navigator.geolocation.watchPosition(
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
        if (config.getConfig("show_found")){
          getCachesUsingAPI();
        } else {
          getFilteredCachesUsingAPI();
        }
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

// function logOut() {
//   Pebble.sendAppMessage({
//     'AppKeyStatusDesc': "Logging Out",
//     'AppKeyStatusProgress': 0,
//     'AppKeyStatusStage': 2
//   });
//   var xhr = new XMLHttpRequest();
// //   xhr.withCredentials = true;
//   xhr.ontimeout = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Timeout while logging out"});
//   };
//   xhr.onerror = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Error logging out"});
//   };
//   xhr.onprogress = function(event) {
//     if (event.lengthComputable) {
//       var percentComplete = Math.round((event.loaded / event.total) * 100);
//       // Only send message if not complete, otherwise let onload deal with it
//       if (percentComplete != 100) {
//         Pebble.sendAppMessage({
//           'AppKeyStatusDesc': "Logging Out",
//           'AppKeyStatusProgress': percentComplete,
//           'AppKeyStatusStage': 2
//         });
//       }
//     }
//   };
//   xhr.onload = function() {
//     config.setConfig('update_login', false);
//     logIn();
//   };
//   xhr.timeout = timeout;
//   xhr.open("GET", "https://www.geocaching.com/play/login");
//   xhr.send();
// }

// function logIn() {
//   Pebble.sendAppMessage({
//           'AppKeyStatusDesc': "Logging In",
//           'AppKeyStatusProgress': 0,
//           'AppKeyStatusStage': 2
//         });
//   var xhr = new XMLHttpRequest();
// //   xhr.withCredentials = true;
//   xhr.ontimeout = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Timeout while logging in"});
//   };
//   xhr.onerror = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Error logging in"});
//   };
//   xhr.onprogress = function(event) {
//     if (event.lengthComputable) {
//       var percentComplete = Math.round((event.loaded / event.total) * 100);
//       // Only send message if not complete, otherwise let onload deal with it
//       if (percentComplete != 100) {
//         Pebble.sendAppMessage({
//           'AppKeyStatusDesc': "Logging In",
//           'AppKeyStatusProgress': percentComplete,
//           'AppKeyStatusStage': 2
//         });
//       }
//     }
//   };
//   xhr.onload = function() {
//     var match = xhr.responseText.match(
//       /<span id="ctl00_ContentBody_lbUsername">[^<]+<strong>([^<]+)<\/strong><\/span>/
//     );
//     if (match) {
//       if (caseInsensitiveCompare(htmlUnescape(config.getConfig('username')), match[1])) {
//         // Logged in as correct user
//         getMapSessionToken();
//       } else {
//         // Will still be signed in as previous user if login failed
//         // This should never happen because we explicitly log out if user/password changes
//         if (xhr.responseText.match(/recaptcha/)) {
//           Pebble.sendAppMessage({'AppKeyStatusError': "Captcha Required\nTry Different Connection"});
//         } else {
//           Pebble.sendAppMessage({'AppKeyStatusError': "Login Rejected.\nCheck settings"});
//         }
//       }
//     } else {
//       // Will only occur if invalid credentials and (previous log in has expired, or was never logged in)
//       if (xhr.responseText.match(/recaptcha/)) {
//         Pebble.sendAppMessage({'AppKeyStatusError': "Captcha Required\nTry Different Connection"});
//       } else {
//         Pebble.sendAppMessage({'AppKeyStatusError': "Login Rejected.\nCheck settings"});
//       }
//     }
//   };
//   xhr.timeout = timeout;
//   xhr.open("POST", "https://www.geocaching.com/login/default.aspx");
//   xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
//   xhr.send("__EVENTTARGET=&__EVENTARGUMENT=" +
//            "&ctl00%24ContentBody%24tbUsername=" + encodeURIComponent(config.getConfig('username')) +
//            "&ctl00%24ContentBody%24tbPassword=" + encodeURIComponent(config.getConfig('password')) + 
//            "&ctl00%24ContentBody%24cbRememberMe=on&ctl00%24ContentBody%24btnSignIn=Sign+In");
// }



// function getMapSessionToken() {
//   Pebble.sendAppMessage({
//           'AppKeyStatusDesc': "Getting Session Token",
//           'AppKeyStatusProgress': 0,
//           'AppKeyStatusStage': 3
//         });
//   var xhr = new XMLHttpRequest();
// //   xhr.withCredentials = true;
//   xhr.ontimeout = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Timeout getting session token"});
//   };
//   xhr.onerror = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Error getting session token"});
//   };
//   xhr.onprogress = function(event) {
//     if (event.lengthComputable) {
//       var percentComplete = Math.round((event.loaded / event.total) * 100);
//       // Only send message if not complete, otherwise let onload deal with it
//       if (percentComplete != 100) {
//         Pebble.sendAppMessage({
//           'AppKeyStatusDesc': "Getting Session Token",
//           'AppKeyStatusProgress': percentComplete,
//           'AppKeyStatusStage': 3
//         });
//       }
//     }
//   };
//   xhr.onload = function() {
//     var match = xhr.responseText.match(/sessionToken:'([^']*)'/);
//     if (match) {
//       var sessionToken = match[1];
//       getJSONData(sessionToken);
//     } else {
//       Pebble.sendAppMessage({'AppKeyStatusError': "Error parsing session token"});
//     }
//   };
//   xhr.timeout = timeout;
//   xhr.open("GET", "https://www.geocaching.com/map/default.aspx?lat=" + lat + "&lng=" + lng);
//   xhr.send();
// }

// function getJSONData(sessionToken) {
//   Pebble.sendAppMessage({
//           'AppKeyStatusDesc': "Getting Geocaches",
//           'AppKeyStatusProgress': 0,
//           'AppKeyStatusStage': 4
//         });
  
//   var unit = config.getConfig('metric') ? "km" : "mi";
//   var filterData = base64.btoa("origin=" + lat + "," + lng + "&radius=" + config.getConfig('search_radius') + unit);
//   var xhr = new XMLHttpRequest();
// //   xhr.withCredentials = true;
//   xhr.ontimeout = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Timeout getting geocaches"});
//   };
//   xhr.onerror = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Error getting geocaches"});
//   };
//   xhr.onprogress = function(event) {
//     if (event.lengthComputable) {
//       var percentComplete = Math.round((event.loaded / event.total) * 100);
//       // Only send message if not complete, otherwise let onload deal with it
//       if (percentComplete != 100) {
//         Pebble.sendAppMessage({
//           'AppKeyStatusDesc': "Getting Geocaches",
//           'AppKeyStatusProgress': percentComplete,
//           'AppKeyStatusStage': 4
//         });
//       }
//     }
//   };
//   xhr.onload = function() {
//     try {
//       var JSONObject = JSON.parse(xhr.responseText);
//       parseJSONObject(JSONObject);
//     } catch(error) {
//       Pebble.sendAppMessage({'AppKeyStatusError': "Error parsing geocaches"});
//     }
//   };
//   xhr.timeout = timeout;
//   xhr.open("GET", "https://tiles01.geocaching.com/map.as?filterData=" + filterData + "&st=" + sessionToken);
//   xhr.send();
// }

// function getCachesUsingProxy() {
//   Pebble.sendAppMessage({
//           'AppKeyStatusDesc': "Getting Geocaches",
//           'AppKeyStatusProgress': 0,
//           'AppKeyStatusStage': 2
//         });
//   var unit = config.getConfig('metric') ? "km" : "mi";
//   var xhr = new XMLHttpRequest();
//   xhr.ontimeout = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Timeout getting geocaches"});
//   };
//   xhr.onerror = function() {
//     Pebble.sendAppMessage({'AppKeyStatusError': "Error getting geocaches"});
//   };
//   xhr.onprogress = function(event) {
//     if (event.lengthComputable) {
//       var percentComplete = Math.round((event.loaded / event.total) * 100);
//       // Only send message if not complete, otherwise let onload deal with it
//       if (percentComplete != 100) {
//         Pebble.sendAppMessage({
//           'AppKeyStatusDesc': "Getting Geocaches",
//           'AppKeyStatusProgress': percentComplete,
//           'AppKeyStatusStage': 2
//         });
//       }
//     }
//   };
//   xhr.onload = function() {
//     try {
//       var JSONObject = JSON.parse(xhr.responseText);
//       if (JSONObject.error) {
//         if (JSONObject.error == "Failed to log in") {
//           Pebble.sendAppMessage({'AppKeyStatusError': "Login Rejected.\nCheck settings"});
//         } else if (JSONObject.error == "Failed to get session token") {
//           Pebble.sendAppMessage({'AppKeyStatusError': "Error getting session token"});
//         }
//       } else {
//         parseJSONObject(JSONObject);
//       }
//     } catch(error) {
//       Pebble.sendAppMessage({'AppKeyStatusError': "Error parsing geocaches"});
//     }
//   };
//   xhr.timeout = timeout;
//   xhr.open("POST", "https://pebble-geocaching.appspot.com");
//   xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
//   xhr.send(
//     "username=" + encodeURIComponent(config.getConfig('username')) +
//     "&password=" + encodeURIComponent(config.getConfig('password')) + 
//     "&lat=" + lat + 
//     "&lng=" + lng + 
//     "&radius=" + config.getConfig('search_radius') + unit
//   );
// }

function getFilteredCachesUsingAPI() {
  Pebble.sendAppMessage({
    'AppKeyStatusDesc': "Getting Geocaches",
    'AppKeyStatusProgress': 0,
    'AppKeyStatusStage': 2
  });
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
          'AppKeyStatusStage': 2
        });
      }
    }
  };
  xhr.onload = function() {
    try {
      var JSONObject = JSON.parse(xhr.responseText);
      if (JSONObject.Status.StatusCode !== 0) {
        Pebble.sendAppMessage({'AppKeyStatusError': "Authentication Error.\nCheck settings"});
        localStorage.removeItem('authToken');
      } else {
        console.log("Filtering caches found by " + JSONObject.Profile.User.UserName);
        getCachesUsingAPI(JSONObject.Profile.User.UserName);
      }
    } catch(error) {
      Pebble.sendAppMessage({'AppKeyStatusError': "Error parsing username"});
    }
  };
  xhr.timeout = timeout;
  //xhr.open("POST", 'https://staging.api.groundspeak.com/Live/V6Beta/geocaching.svc/GetYourUserProfile?format=Json');
  xhr.open("POST", 'https://api.groundspeak.com/LiveV6/Geocaching.svc/GetYourUserProfile?format=Json');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({AccessToken: localStorage.getItem("authToken")}));
}

function getCachesUsingAPI(username) {
  Pebble.sendAppMessage({
    'AppKeyStatusDesc': "Getting Geocaches",
    'AppKeyStatusProgress': 0,
    'AppKeyStatusStage': 2
  });
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
          'AppKeyStatusStage': 2
        });
      }
    }
  };
  xhr.onload = function() {
    try {
      var JSONObject = JSON.parse(xhr.responseText);
      //console.log(JSON.stringify(JSONObject, null, 2))
      if (JSONObject.Status.StatusCode !== 0) {
        Pebble.sendAppMessage({'AppKeyStatusError': "Authentication Error.\nCheck settings"});
        localStorage.removeItem('authToken');
      } else {
        parseJSONObject(JSONObject.Geocaches);
      }
    } catch(error) {
      Pebble.sendAppMessage({'AppKeyStatusError': "Error parsing geocaches"});
    }
  };
  xhr.timeout = timeout;
  //xhr.open("POST", 'https://staging.api.groundspeak.com/Live/V6Beta/geocaching.svc/SearchForGeocaches?format=Json');
  xhr.open("POST", 'https://api.groundspeak.com/LiveV6/Geocaching.svc/SearchForGeocaches?format=Json');
  xhr.setRequestHeader('Content-Type', 'application/json');

  var radius;
  if (config.getConfig("metric")) {
    radius = config.getConfig("search_radius") * 1000;
  } else {
    radius = Math.round(location.metresInMiles(config.getConfig("search_radius")));
  }

  //if username then filter
  var body = {
    AccessToken: localStorage.getItem("authToken"),
    IsLite: true,
    MaxPerPage: 50,
    GeocacheLogCount: 0,
    TrackableLogCount: 0,
    PointRadius:{ 
      DistanceInMeters: radius,
      Point:{
        Latitude: lat,
        Longitude: lng
      }
    }//,
    //"NotFoundByUsers":{"UserNames": ["testtesttest3"]}
  };
  if (username) {
    body.NotFoundByUsers = {UserNames: [username]};
  }
  xhr.send(JSON.stringify(body));
}

function parseJSONObject(JSONObject) {
  Pebble.sendAppMessage({
    'AppKeyStatusDesc': "Parsing Geocaches",
    'AppKeyStatusProgress': 0,
    'AppKeyStatusStage': 3
  });
  // Reset geocaches array
  geocaches = [];
  var sentPercent = 0;
  //console.log(JSON.stringify(JSONObject, null, 2));
  JSONObject.forEach(function(geocache, index) {
    //console.log(geocache.Code);
    var percentComplete = Math.round((index / JSONObject.length) * 10) * 10;
    if (percentComplete != sentPercent) {
      Pebble.sendAppMessage({
        'AppKeyStatusDesc': "Parsing Geocaches",
        'AppKeyStatusProgress': percentComplete,
        'AppKeyStatusStage': 3
      });
      sentPercent = percentComplete;
    }
    // Don't include found geocaches if filter applied, or disabled geocaches
    //if (
    //  !((feature.properties.icon === "MyFind") && !config.getConfig('show_found')) &&
    //  feature.properties.available
    //) {
    
    // If geocache has corrected coordinates, use them
    var cacheLat = geocache.Latitude;
    var cacheLng = geocache.Longitude;
    geocache.UserWaypoints.forEach(function(waypoint) {
      if (waypoint.IsCorrectedCoordinate) {
        cacheLat = waypoint.Latitude;
        cacheLng = waypoint.Longitude;
      }
    });
    
    var distanceAndBearing = location.distanceAndBearing(lat, lng, cacheLat, cacheLng);
    var distanceAndDirection = location.distanceAsString(distanceAndBearing.distance, config.getConfig('metric')) +
        " " + distanceAndBearing.direction;
    geocaches.push({
      distanceInM: distanceAndBearing.distance,
      distanceAsString: distanceAndDirection,
      lat: cacheLat,
      lng: cacheLng,
      key: geocache.Code,
      name: geocache.Name,
    });
    //}
  });
  console.log("Got " + geocaches.length + " geocaches");
  
  // Sort array by distance
  geocaches.sort(function sort(a,b) {
    return a.distanceInM - b.distanceInM;
  });
  
  // Drop all but the first 100
  //geocaches.splice(maxNumCaches);
  
  // Save to local storage for retreival later
  localStorage.setItem('geocaches', JSON.stringify(geocaches));
  
  // Send geocaches to watch
  sendGeocaches();
  
  //console.log(JSON.stringify(geocaches, null, 2))
}

function sendGeocaches() {
  var serializedGeocaches = "";
  geocaches.forEach(function (geocache) {
    serializedGeocaches +=
      geocache.distanceAsString + String.fromCharCode(30) +
      geocache.name.substring(0, 59) + String.fromCharCode(30) + // Trim name to 59 characters because that's the size of the buffer on the watch
      geocache.key.substring(2) + String.fromCharCode(31); // Remove "GC" from the beginning of the key as it is always "GC"
  });
  console.log('Sending geocaches to watch. Message size: ' + serializedGeocaches.length + ' + 8');
  Pebble.sendAppMessage({
    'AppKeyGeocaches': serializedGeocaches,
    'AppKeyNumCaches': geocaches.length
  });
}

// function caseInsensitiveCompare(str1, str2) {
//   return (str1.toUpperCase() === str2.toUpperCase());
// }

// function htmlUnescape(string) {    
//   string = string.replace(/&amp;/g, "&");
//   string = string.replace(/&#39;/g, "'");
//   string = string.replace(/&lt;/g, "<");
//   string = string.replace(/&gt;/g, ">");
//   string = string.replace(/&quot;/g, "\"");
//   // Could do this better. especially with numbered entities.
//   return string;
// }

function startNav(cacheIndex) {

  locationWatcher = navigator.geolocation.watchPosition(function(currPosition) {

    var distanceAndBearing = location.distanceAndBearing(
      currPosition.coords.latitude,
      currPosition.coords.longitude,
      geocaches[cacheIndex].lat,
      geocaches[cacheIndex].lng
    );

    var distanceString = location.distanceAsString(distanceAndBearing.distance, config.getConfig('metric')) + " ± " + 
                         location.distanceAsString(currPosition.coords.accuracy, config.getConfig('metric'));

    Pebble.sendAppMessage({
      'AppKeyDistance': distanceString,
      'AppKeyBearing': distanceAndBearing.bearing
    });

  });

}

function stopNav() {
  navigator.geolocation.clearWatch(locationWatcher);
}
