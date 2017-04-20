//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const removeDiacritics = require('diacritics').remove;

////////////////////////////////////////////////////
//GTFS MongoDB feed info///
////////////////////////////////////////////////////

const gtfs = require('gtfs');
const utils = require('./utils.js');
const mongoose = require('mongoose');
const config = require('./config.json');

mongoose.Promise = global.Promise;
mongoose.connect(config.mongoUrl);

/*gtfs.import(config, (err) => {
  if (err) return console.error(err);

  console.log('Import Successful')
});*/

//////////////////////////////////////////
//End MongoDB GTFS info
//////////////////////////////////////////

var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<footer id=\"gWidget\"></footer><script src=\"https://widget.glitch.me/widget.min.js\"></script></body></html>";

// The rest of the code implements the routes for our Express server.
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Display the web page
app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(messengerButton);
  res.end();
});

// Message processing
app.post('/webhook', function (req, res) {
  console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          receivedPostback(event);   
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

//storing last Stop requested

var lastStop = [];
var lastStopRequested = null; 
// Incoming events handling
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  //Incoming message here - de-diacritic...ing? and removing "." + "-"
  var messageText = removeDiacritics(message.text.toLowerCase().replace(/[-.]/g,function(match) {return (match==="-" ? " " : "")}));
  var messageAttachments = message.attachments;

  ///////////////////////////////
  //Message Switch Cases
  //////////////////////////////  
  
  //switch statement full
  if (messageText) {
      // If we receive a text message, check to see if it matches a keyword
      // and send back the template example. Otherwise, just echo the text we received.
      switch (messageText) {
      
      /////////////////////////////////////////////////////////
      // GTFS Query
      ////////////////////////////////////////////////////////
      
        /* La Defense 
        case 'la defense':
          utils.searchStop(senderID, 'fr-idf', '%3AOIF%3A100110001%3A1OIF439', '%3AOIF%3ASA%3A8738221', 0, 4, null);
        */
        
        case 'agencies':
          utils.gtfsAgencies(senderID, 'dataryxs', 'LA');
          break;  
          
        case 'routeforstop':
          utils.gtfsRouteForStop(senderID, 'dataryxs', 'SABINUS');
          break;
        
        case 'stops':
          gtfs.getStops('dataryxs', 'PLACE_3_JUMEAUX')
            .then(stops => {
              console.log(stops);            
            });
          
        case 'timebystop':
          gtfs.getStoptimesByStop('dataryxs', 'LA', 'PLACE_3_JUMEAUX', 'LA>033')
            .catch( err => {
              console.log(err);
            });
          break;
          
        case 'timebytrip':
          gtfs.getStoptimesByTrip('dataryxs', 'LA>033')
            .then(stoptimes => {
              console.log(stoptimes);
            });
          break;
          
        case 'stopbyroute':
          gtfs.getStopsByRoute('dataryxs', 'LA')
            .then(routes => {
              //console.log(routes.map( function(route){ return route.stops; }));
              console.log(routes[0].stops);
            });
          break;
          
        case 'stopattr':
          gtfs.getStopAttributes('dataryxs', 'PLACE_3_JUMEAUX')
            .then(stopattr => {
              console.log(stopattr);
            });
          break;
          
        default:
          utils.sendTextMessage(senderID, messageText);
      }
    } else if (messageAttachments) {
      utils.sendTextMessage(senderID, "Message with attachment received");
    }
  
  } //receivedMessage end

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  utils.sendTextMessage(senderID, "Postback called");
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});