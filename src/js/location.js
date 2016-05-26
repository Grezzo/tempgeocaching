/*globals module*/ // Stop complaining about module being undefined!

module.exports.distanceAndBearing = distanceAndBearing;
module.exports.distanceAsString = distanceAsString;
module.exports.metresInMiles = metresInMiles;

var trigMaxAngle = 65536; // Maximum angle for Pebble maths (basically 360 degrees)

var R = 6371000; // Radius of the earth in metres

var metresInYard = 0.9144; // Length of a yard in metres
var yardsInMile = 1760; // Number of yards in a mile

function toRadians(degrees) {
  return degrees / (180 / Math.PI);
}

// function toDegrees(radians) {
//   return radians * (180 / Math.PI);
// }

function toTrigAngle(radians) {
  return radians * (trigMaxAngle / (2 * Math.PI));
}

function distanceAndBearing(currLat, currLon, destLat, destLon) {
  var deltaLat = toRadians(destLat-currLat);
  var deltaLon = toRadians(destLon-currLon);

  var currLatRad = toRadians(currLat);
  var destLatRad = toRadians(destLat);
  
  //Get distance between coords
  var a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) + Math.sin(deltaLon/2) * Math.sin(deltaLon/2) * Math.cos(currLatRad) * Math.cos(destLatRad);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var distance = R * c;
    
  //Get bearing
  var y = Math.sin(deltaLon) * Math.cos(destLatRad);
  var x = Math.cos(currLatRad)*Math.sin(destLatRad) - Math.sin(currLatRad)*Math.cos(destLatRad)*Math.cos(deltaLon);
  var bearing = (Math.round(toTrigAngle(Math.atan2(y, x))) + trigMaxAngle) % trigMaxAngle;
  
  //Get direction
  var directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  var section = Math.floor(((bearing + (trigMaxAngle / 16)) % trigMaxAngle) / (trigMaxAngle / 8));
  var direction = directions[section];      
  
  return {distance: distance, bearing: bearing, direction: direction};
}

function distanceAsString(metres, metric) {
  if (metric === true) {
    if (metres < 1000) {
      return Math.round(metres) + "m";
    } else {
      return (metres / 1000).toFixed(2) + "km";
    }
  } else {
    var yards = metres / metresInYard;
    if (yards < yardsInMile) {
      return Math.round(yards) + "yd";
    } else {
      return (yards / yardsInMile).toFixed(2) + "mi";
    }
  }
}

function metresInMiles(miles) {
  return miles * yardsInMile * metresInYard;
}