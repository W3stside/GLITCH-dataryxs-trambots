const request = require('request');
const gtfs = require('gtfs');
const bot = require('./bot.js');

//////////////////////////
// GTFS handlers
/////////////////////////

exports.gtfsAgencies = function gtfsAgencies(recipientID, agency_key, route_id) {
  var jsonData = "";
  gtfs.getRoutesById(agency_key, route_id)
    .then( function (routes) {
      return jsonData = routes.route_short_name;
    })
    .then( function (routes){
        
    })
    .catch(function (err) {
       console.log("ERROR: ",err);      
    });
}

exports.gtfsRouteForStop = function gtfsRouteForStop (recipientID, agency_key, stop_id) {
  var jsonData = '';
  gtfs.getRoutesByStop(agency_key, stop_id)
    .then(routes => {
      return jsonData = 'Route ' + routes[0].route_long_name + ' sur la ' + routes[0].route_short_name;
    })
    .then(routes => {
      return jsonData += '\n' + 'Thanks for riding';
    })
    .then(routes => {
      sendResponse(recipientID, routes, null);
    })
    .catch(err => {
      console.log(err);
    })
};

/*exports.gtfsStopTimesByStop = function gtfsStopTimesByStop (recipientID, agency_key, route_id, stop_id, direction_id) {
  //console.log(gtfs.getStoptimesByStop(recipientID, agency_key, route_id, stop_id, direction_id));
  gtfs.getStoptimesByStop(agency_key, route_id, stop_id, direction_id)
    .then(stoptimes => {
      console.log('success');
    })
    .catch(error => {
      console.log(error)
    })
};*/

///////////////////////////////////
// Generic Send Helpers
///////////////////////////////////

exports.sendTextMessage = function sendTextMessage(recipientID, messageText) {
  var messageData = {
    recipient: {
      id: recipientID
    },
    message: {
      text: 'Écrivez simplement votre arrêt et je vous dirai les prochains horaires !'
    }
  };

  callSendAPI(messageData);
}

exports.sendGenericMessage = function sendGenericMessage(recipientID) {
  var messageData = {
    recipient: {
      id: recipientID
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

//////////////////////////////
//Format Time before SearchStop Function
/////////////////////////////

function timeFormatter (time) {
	var timeArr = time.split('T');
	var finalTime = timeArr[1].slice(0,2) + ':' + timeArr[1].slice(2,4);
	return finalTime;
}

/////////////////////////////
// Navitia searchStop Function
/////////////////////////////

var lastStop = [];
var lastStopRequested = null; 

exports.searchStop = function searchStop (senderID, regionName, lineName, stopName, startIterator, loopLimit, key) {
  
  lastStopRequested = {
    sender: senderID,
    region: regionName,
    line: lineName,
    stop: stopName,
    startIterator: startIterator,
    loopLimit: loopLimit,
    key: key
  };
  
  lastStop = Array.from(arguments);
  console.log(lastStop);
    
  var jsonData = '';
  //Request to Navitia API
  request({
    uri: 'http://' + process.env.apikey + '@api.navitia.io/v1/coverage/' + regionName + '/lines/line' + lineName + '/stop_areas/stop_area' + stopName + '/departures?',
    //Callback to fill in jsonData with Navitia JSON information
  }, function (error, response, body) {
    //If api returns A-OK, continue
      if (!error && response.statusCode == 200){
        //set body of return JSON as var data
        var data = JSON.parse(body);
        //Log the response headers
        console.log('server encoded the data as: ' + (response.headers['content-encoding'] || 'identity'));
        //Start return message content Loop
        //Start with setting default intro message
        for (let i = startIterator; i < loopLimit; i++) {
          if (loopLimit === 4) {
            jsonData = 'Prochains métro à l\'arret ' + JSON.stringify(data.departures[i].stop_point.name) + ' sur la ligne M' + JSON.stringify(data.departures[i].display_informations.label) + ' ' + String.fromCodePoint(128647) + '\n\n';
            //Begin second loop for Hours
            for (let i = startIterator; i < loopLimit; i++) {
              data.departures[i] ? jsonData += timeFormatter(data.departures[i].stop_date_time.departure_date_time) + ' ' + '>' + ' ' + 'Direction ' + data.departures[i].display_informations.direction + '\n' : '';
            }; //end 2nd For Loop     
          //On "plus" send back all times  
          } 
          else if (loopLimit === 8) {
            jsonData = 'Horaires additionnelles:'  + '\n\n';
            for (let i = startIterator; i < data.departures.length; i++) {
              jsonData += timeFormatter(data.departures[i].stop_date_time.departure_date_time) + ' ' + '>' + ' ' + 'Direction ' + data.departures[i].display_informations.direction + '\n';
            }; //end 2nd For Loop
          }
          //If data.departures[i] === non existant, simply send back msg below  
          else {
            jsonData = 'Plus d\'horaires additionnelles';
          }
        } //end 1st For Loop
        jsonData = jsonData.replace(/"/g,''); //removing annoying "" in JSON

        //Calls sendResponse which formats data and sends to callSendAPI
        sendResponse(senderID , jsonData, lastStopRequested);
        } else {
          console.log(error);
        }    
    })
}

/////////////////////////////
// Navitia multiStop Function
/////////////////////////////

exports.multiSearchStop = function multiSearchStop (item, index, multiStop) {
  this.searchStop(item.senderID,item.region,item.line,item.stop,item.startIterator,item.loopLimit,item.key);
}  

//////////////////////////////////////////////////////////////////////////////////////////
// moreTimes = if user messages 'plus'
//////////////////////////////////////////////////////////////////////////////////////////

exports.moreTimes = function moreTimes(senderID, messageText) {
  if (lastStopRequested === null) {
    bot.sendTextMessage(senderID, messageText);
  } else {
    //create var lastStopRequested to store last requested stop (duh) and pass it into the next message
    //function moreTimes() will use lastStopRequested to send more times if requested
    this.searchStop(senderID, lastStopRequested.region, lastStopRequested.line, lastStopRequested.stop, lastStopRequested.startIterator + 4, lastStopRequested.loopLimit + 4);
  }
}

/////////////////////////////////////////////////////////////////////////////////////////
//sendResponse = formatting jsonData and sender info before giving info to callSendAPI
/////////////////////////////////////////////////////////////////////////////////////////

function sendResponse(senderID , jsonData, lastStopRequested) {
  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      text: jsonData
    }
  }
  callSendAPI(messageData, lastStopRequested);
}

//////////////////
// Call Send API
//////////////////

function callSendAPI(messageData, lastStopRequested) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { //query-string 
      access_token: process.env.PAGE_ACCESS_TOKEN 
    },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else if (error) {
      console.error("Unable to send message.", error);
    }
  });  
}