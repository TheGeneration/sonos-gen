var http = require('http');
var sonos = require('sonos');

const PORT = 7544;

var currentTrack = {};
var currentState = 'paused';

function handleRequest(req, res) {
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify({
		'track': currentTrack,
		'state': currentState
	}));
}

var server = http.createServer(handleRequest);

server.listen(PORT, function() {
	console.log('=== Generation Sonos Server ===');
	console.log('Server initialized and listening to port ' + PORT);
});

// var sonosDevicePollInterval = 30 * 1000;
var sonosDataPollInterval = 1000;

var sonosDevice = false;

function deviceSearchCallback(device) {
	if(sonosDevice !== false) {
		return;
	}

	console.log('SONOS device found!');

	sonosDevice = device;

	initDataPoll();
}

console.log('Searching for SONOS device...');
sonos.search(deviceSearchCallback);

function initDataPoll() {
	currentTrackPoll();
	currentStatePoll();
}

function currentTrackPoll() {
	if(sonosDevice === false) {
		sonos.search(deviceSearchCallback);
	}

	sonosDevice.currentTrack(function(err, track) {
		if(err || typeof(track.title) === 'undefined') {
			console.log('Couldn\'t fetch track title. Searching for SONOS device again.');
			sonosDevice = false;
			sonos.search(deviceSearchCallback);
		} else {
			currentTrack = {
				name: track.artist + ' - ' + track.title,
				duration: track.duration,
				position: track.position
			};

			setTimeout(function() {
				currentTrackPoll();
			}, sonosDataPollInterval);
		}
	});
}

function currentStatePoll() {
	if(sonosDevice === false) {
		sonos.search(deviceSearchCallback);
	}

	sonosDevice.getCurrentState(function(err, state) {
		if(err || typeof(state) === 'undefined') {
			console.log('Couldn\'t fetch track title. Searching for SONOS device again.');
			sonosDevice = false;
			sonos.search(deviceSearchCallback);
		} else {
			currentState = state;

			setTimeout(function() {
				currentStatePoll();
			}, sonosDataPollInterval);
		}
	});
}