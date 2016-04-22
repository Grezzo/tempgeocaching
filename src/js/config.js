/*globals require, module*/ //Stop complaining about require and module being undefined!
var gc = require('geocaching');

module.exports.showConfigWindow = showConfigWindow;
module.exports.processConfig = processConfig;
module.exports.getConfig = getConfig;

function getConfig(key) {
  var configData = JSON.parse(localStorage.getItem("config"));
  return configData[key];
}

function showConfigWindow() {
  
  var configData = JSON.parse(localStorage.getItem("config"));
  var username = configData ? configData.username : ""; // Default of ""
  var search_radius = configData ? configData.search_radius : 10; // Default of 10
  var show_found = configData ? configData.show_found : false; // Filter premium if no config
  var metric = configData ? configData.metric : true; // Set metric to true if no config

  /* jshint multistr: true */ //Suppress warnings about line continuations used in embedded config html
  var configPage = "\
<html><head>\n\
<style>\n\
input {\n\
  height: 44px;\n\
}\n\
input[type=text], input[type=password] {\n\
  font-size: 17px;\n\
}\n\
input[type=checkbox], input[type=radio] {\n\
  width: 44px;\n\
}\n\
input[type=button] {\n\
 font-size: 30px;\n\
 font-weight: bold;\n\
 width: 100%;\n\
}\n\
</style>\n\
<script>\n\
// Get query variables\n\
function getQueryParam(variable, defaultValue) {\n\
  // Find all URL parameters\n\
  var query = location.search.substring(1);\n\
  var vars = query.split('&');\n\
  for (var i = 0; i < vars.length; i++) {\n\
    var pair = vars[i].split('=');\n\
    // If the query variable parameter is found, decode it to use and return it for use\n\
    if (pair[0] === variable) {\n\
      return decodeURIComponent(pair[1]);\n\
    }\n\
  }\n\
  return defaultValue || false;\n\
}\n\
\n\
window.addEventListener(\"DOMContentLoaded\", function() {\n\
  document.getElementById(\"saveButton\").addEventListener(\"click\", function () {\n\
    var searchRadius = document.getElementById(\"search_radius\").value\n\
    if (\n\
      searchRadius.match(/^[0-9]+$/) === null ||\n\
      searchRadius > 100 ||\n\
      searchRadius < 1\n\
    ) {\n\
      alert('Radius must be an integer between 1 and 100');\n\
      return;\n\
    }\n\
    document.getElementById(\"saveButton\").disabled = true;\n\
    var config = {\n\
      update_login: document.getElementById(\"update_login\").checked,\n\
      username: document.getElementById(\"username\").value,\n\
      password: document.getElementById(\"password\").value,\n\
      show_found: document.getElementById(\"show_found\").checked,\n\
      search_radius: parseInt(document.getElementById(\"search_radius\").value),\n\
      metric: document.getElementById(\"metric\").checked\n\
    };\n\
    // Set the return URL depending on the runtime environment\n\
    var return_to = getQueryParam('return_to', 'pebblejs://close#');\n\
    location.href = return_to + encodeURIComponent(JSON.stringify(config));\n\
  });\n\
  document.getElementById(\"update_login\").addEventListener(\"click\", function () {\n\
    var displayValue;\
    if (document.getElementById(\"update_login\").checked) {\n\
      displayValue = \"\";\n\
    } else {\n\
      displayValue = \"none\";\n\
    };\n\
    document.getElementById(\"username_row\").style.display = displayValue\n\
    document.getElementById(\"password_row\").style.display = displayValue\n\
  });\n\
  document.getElementById(\"metric\").addEventListener(\"click\", function () {\n\
    document.getElementById(\"units\").innerHTML = \"km\";\n\
  });\n\
  document.getElementById(\"imperial\").addEventListener(\"click\", function () {\n\
    document.getElementById(\"units\").innerHTML = \"mi\";\n\
  });\n\
});\n\
</script>\n\
<style>body {font-family: sans-serif;}</style>\n\
</head><body>\n\
You must enter your geocaching.com credentials in order to use this app.<br/><br/>\n\
Your credentials are only ever sent to geocaching.com over an encrypted (https) connection and are not sent anywhere else.<br/><br/>\n\
If you don't have a password (i.e. you normally log in using Facebook), you will need to get one from https://www.geocaching.com/account/identify<br/><br/><br/>\n\
A lower search radius will mean marginally faster searching (especially on a slow internet connection). A maximum of 100 geocaches are shown on the watch at one time.<br/><br/>\n\
<table><tr>\n\
<td>Change Username and Password</td>\n\
<td><input type=\"checkbox\" id=\"update_login\"" + (!configData ? " checked disabled" : "") + "></td>\n\
</tr><tr id=\"username_row\"" + (configData ? " style=\"display: none\"" : "") + ">\n\
<td>Geocaching.com Username</td>\n\
<td><input type=\"text\" id=\"username\" value=\"" + username + "\"></td>\n\
</tr><tr id=\"password_row\"" + (configData ? " style=\"display: none\"" : "") + ">\n\
<td>Geocaching.com Password</td>\n\
<td><input type=\"password\" id=\"password\"></td>\n\
</tr><tr>\n\
<td>Search Radius (<span id=\"units\">" + (metric ? "km" : "mi") + "</span>)</td>\n\
<td><input type=\"text\" id=\"search_radius\" value=\"" + search_radius + "\"></td>\n\
</tr><tr>\n\
<td>Show Found Caches</td>\n\
<td><input type=\"checkbox\" id=\"show_found\"" + (show_found ? " checked" : "") + "></td>\n\
</tr><tr>\n\
<td>Metric</td>\n\
<td><input type=\"radio\" value=\"metric\" name=\"units\" id=\"metric\"" + (metric ? " checked" : "") + "></td>\n\
</tr><tr>\n\
<td>Imperial</td>\n\
<td><input type=\"radio\" value=\"imperial\" name=\"units\" id=\"imperial\"" + (!metric ? " checked" : "") + "></td>\n\
</tr></table>\n\
<input type=\"button\" value=\"Save\" id=\"saveButton\">\n\
</body></html><!--\
"; // Comment at end removes cloudpebble's querystring from appearing in html if used in emulator.
  /* jshint multistr: false */ // Turn warnings back on
  
  console.log("Loading configuration page");
  Pebble.openURL("data:text/html," + encodeURIComponent(configPage));
}

function processConfig(e) {  
  
  //Check whether config was cancelled
  if (e.response === "") {
    console.log("Configuration cancelled");
  } else {
    
    // Decode and parse config data as JSON
    var oldConfigData = JSON.parse(localStorage.getItem("config"));
    var newConfigData = JSON.parse(decodeURIComponent(e.response));
    
    // Keep old username and password if it shouldn't be updated
    if (!newConfigData.update_login) {
      console.log('Keeping old username and password');
      newConfigData.username = oldConfigData.username;
      newConfigData.password = oldConfigData.password;
    }
    
    // Save new config data
    localStorage.setItem("config", JSON.stringify(newConfigData));
    console.log("Config updated");
    
    // If this is the first time it has been configured, it will have
    // stalled on first screen, so now it's configured, it's time to
    // get geocaches
    if (!oldConfigData) {
      Pebble.sendAppMessage({'AppKeyConfigured': true});
      console.log('First time configuration done. Getting geocaches');
      gc.getGeocaches();
    }
  }

}