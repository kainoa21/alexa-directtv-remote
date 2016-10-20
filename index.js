/**
 * This Alexa skill allows a user to control a DirectTV set top box.
 **/
 
var request = require('request');
var async = require('async');

// Put your public IP here
var REMOTE_IP = '68.70.138.99';

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Prevent someone else from configuring a skill that sends requests to this function.
         */
        
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.7bc28e91-779f-4e2a-9d8a-1768d38664d4"
        && event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.ee2bc5f4-c4ac-4ffa-ade8-1193a2aa6e23") {
             console.log("Invalid Application ID: " + event.session.application.applicationId);
             context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        }  else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
                + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
                + ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
                + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("OnIntent" === intentName) {
        getCommandResponse('poweron', callback);
    } else if ("OffIntent" === intentName) {
        getCommandResponse('poweroff', callback);
    } else if ("ChannelUpIntent" === intentName) {
        getCommandResponse('chanup', callback);
    } else if ("ChannelDownIntent" === intentName) {
        getCommandResponse('chandown', callback);
    } else if ("ChannelPreviousIntent" === intentName) {
        getCommandResponse('prev', callback);
    } else if ("CommandIntent" === intentName) {
        getCommandResponse(intent.slots.Command.value, callback);
    } else if ("TuneIntent" === intentName) {
        getTuneResponse(intent, callback);
    } else if ("WhatsOnIntent" === intentName) {
        getWhatsOnResponse(intent, callback);
    } else if ("FastForwardIntent" === intentName) {
        handleFastForwardAndRewind(intent, 'fast forward', callback);
    } else if ("PlayIntent" === intentName) {
        getCommandResponse('play', callback)
    } else if ("RewindIntent" === intentName) {
        handleFastForwardAndRewind(intent, 'rewind', callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
                + ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

/**
 * Map command values to the appropriate button names for the Direct TV api
 */
function mapCommand(input) {
    var output = input;

    // map key value
    switch(input) {
        case 'previous':
            output = 'prev';
            break;
        case 'rewind':
            output = 'rew';
            break;
        case 'fast forward':
            output = 'ffwd';
            break;
        case 'channel up':
            output = 'chanup';
            break;
        case 'channel down':
            output = 'chandown';
            break;
        case 'zero':
            output = '0';
            break;
        case 'one':
            output = '1';
            break;
        case 'two':
            output = '2';
            break;
        case 'three':
            output = '3';
            break;
        case 'four':
            output = '4';
            break;
        case 'five':
            output = '5';
            break;
        case 'six':
            output = '6';
            break;
        case 'seven':
            output = '7';
            break;
        case 'eight':
            output = '8';
            break;
        case 'nine':
            output = '9';
            break;
        default:
            output = input;
    }

    return output;
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome to the the Direct TV remote.";
    var speechOutput = "What would you like to do?";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "I'm sorry I didn't understand that, what would you like to do?";
    var shouldEndSession = false;

    callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleFastForwardAndRewind(intent, key, callback) {
    var speed = intent.slots.Speed ? Number(intent.slots.Speed.value) : 0;
    console.log("SPEED", speed);
    if (speed > 0) {
        var keys = [];
        for (i=0; i < speed; i++) {
            keys.push(key);
        }
        getCommandResponse(keys, callback);
    } else {
        getCommandResponse(key, callback);
    }
}
    
function getCommandResponse(key, callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var repromptText = null;
    var cardTitle = "Direct TV Remote";
    var speechOutput = "Pressing " + key;
    var repromptText = "I'm sorry, I did not recognize the key you asked me to press.  Try saying, press select or press chanup.";
    var shouldEndSession = true;

    // map keys
    var keys;
    if (Array.isArray(key)) {
        speechOutput = "Pressing " + key[0];
        keys = key.map(function(k) { return mapCommand(k); });
    } else if (key == "recording" || key == "recordings") {
        // sequence of keys to get to the DVR recordings
        keys = ['exit','exit','menu','down','down','select','select'];
    } else {
        keys = [mapCommand(key)];
    }

    async.eachSeries(keys, function(key, cb) {
        var url = 'http://' + REMOTE_IP + ':8080/remote/processKey?key=' + key;
        console.log("REQUEST: " + url);
        request.get(url, function (err, res, body) {
            console.log(body);
            cb(err);
        });
    }, function(err) {
        if( err ) {
            // One of the iterations produced an error.
            // All processing will now stop.
            console.log(err);
            speechOutput = "I'm sorry, there was an error communicating with the Direct TV set top box.";
        }

        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

function getTuneResponse(intent, callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Direct TV Remote";
    var channel = intent.slots.Channel.value;
    var speechOutput = "Tuning to channel " + channel;
    var repromptText = "I'm sorry, I did not recognize the channel you asked me to tune to.  Try saying, channel five, channel eighty four, or channel one hundred forty two.";
    var shouldEndSession = true;

    var url = 'http://' + REMOTE_IP + ':8080/tv/tune?major=' + channel;
    console.log("REQUEST: " + url);
    
    request.get(url, function (err, res, body) {
        console.log(body);
        if (err) {
            // do something
            speechOutput = "I'm sorry, there was an error communicating with the Direct TV set top box.";
        }
        
        callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

function getWhatsOnResponse(intent, callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Direct TV Remote";
    var channel = intent.slots.Channel.value;
    var speechOutput = "I'm sorry, there was no program info for channel " + channel + ".";
    var repromptText = "I'm sorry, I did not recognize the channel you asked me to check.  Try saying, channel five, channel eighty four, or channel one hundred forty two.";
    var shouldEndSession = true;

    var url = 'http://' + REMOTE_IP + ':8080/tv/getProgInfo?major=' + channel;
    console.log("REQUEST: " + url);

    request.get(url, function (err, res, body) {
        console.log(body);
        if (err) {
            // do something
            speechOutput = "I'm sorry, there was an error communicating with the Direct TV set top box.";
        }

        var response = JSON.parse(body);
        if (response.title) {
            speechOutput = response.episodeTitle ? response.title + ' ' + response.episodeTitle : response.title;
        }

        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}
