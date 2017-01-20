const env = require('node-env-file'),
	http = require('http'),
	https = require('https'),
	fs = require('fs'),
	crypto = require('crypto'),
	sonos = require('sonos');

env(__dirname + '/.env');

const PORT = 7544;

var currentTrack = {};
var currentState = 'paused';
var currentVolume = 0;

function handleRequest(req, res) {
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.end(JSON.stringify({
		'track': currentTrack,
		'state': currentState,
		'volume': currentVolume
	}));
}

var server;

if(process.env.USE_SSL != 'false') {
	var privateKey = fs.readFileSync(process.env.CERT_PRIVATE_KEY_FILE).toString();
	var cert = fs.readFileSync(process.env.CERT_CERTIFICATE_FILE).toString();

	var serverOptions = {
		key: privateKey,
		cert: cert
	};

	server = https.createServer(serverOptions);
} else {
	server = http.createServer();
}

server.addListener('request', handleRequest);

server.listen(PORT, function() {
	console.log('=== Generation Sonos Server ===');
	console.log('Server initialized and listening to port ' + PORT);
});

// var sonosDevicePollInterval = 30 * 1000;
var sonosDataPollInterval = 1000 * 1;

var sonosDevice = false;

function deviceSearchCallback(device) {
	if(sonosDevice !== false) {
		return;
	}

	console.log('SONOS device found!');

	console.log(device);

	sonosDevice = device;

	initDataPoll();
}

console.log('Searching for SONOS device...');
sonos.search(deviceSearchCallback);

var pollTimeouts = [];

function initDataPoll() {
	currentTrackPoll();
	currentStatePoll();
	currentVolumePoll();
}

function clearPollTimeouts() {
	for(var i in pollTimeouts) {
		clearTimeout(pollTimeouts[i]);
	}

	pollTimeouts = [];
}

function currentTrackPoll() {
	// console.log('Polling track');

	if(typeof sonosDevice.currentTrack !== 'function') {
		console.log('Current Track is not a function. Re-scheduling...');

		sonosDevice = new sonos.Sonos(sonosDevice.host, sonosDevice.port);

		var timeoutId = setTimeout(function() {
			pollTimeouts.splice(pollTimeouts.indexOf(timeoutId), 1);
			currentTrackPoll();
		}, sonosDataPollInterval);

		pollTimeouts.push(timeoutId);

		return;
	}

	request = sonosDevice.currentTrack(function(err, track) {
		if(err || typeof(track.title) === 'undefined') {
			clearPollTimeouts();

			sonos.search(deviceSearchCallback);
			sonosDevice = false;

			console.log('Couldn\'t fetch track title.');
			console.log(err, track);

			return;
		} else {
			currentTrack = {
				name: track.artist + ' - ' + track.title,
				duration: track.duration,
				position: track.position
			};
		}

		var timeoutId = setTimeout(function() {
			pollTimeouts.splice(pollTimeouts.indexOf(timeoutId), 1);
			currentTrackPoll();
		}, sonosDataPollInterval);

		pollTimeouts.push(timeoutId);
	});
}

function currentStatePoll() {
	// console.log('Polling state');

	if(typeof sonosDevice.getCurrentState !== 'function') {
		var timeoutId = setTimeout(function() {
			pollTimeouts.splice(pollTimeouts.indexOf(timeoutId), 1);
			currentStatePoll();
		}, sonosDataPollInterval);

		pollTimeouts.push(timeoutId);

		return;
	}

	sonosDevice.getCurrentState(function(err, state) {
		if(err || typeof(state) === 'undefined') {
			console.log('Couldn\'t fetch track state.');
			console.log(err, state);
			currentState = 'stopped';
		} else {
			currentState = state;
		}

		var timeoutId = setTimeout(function() {
			pollTimeouts.splice(pollTimeouts.indexOf(timeoutId), 1);
			currentStatePoll();
		}, sonosDataPollInterval);

		pollTimeouts.push(timeoutId);
	});
}

function currentVolumePoll() {
	// console.log('Polling volume');

	if(typeof sonosDevice.getVolume !== 'function') {
		var timeoutId = setTimeout(function() {
			pollTimeouts.splice(pollTimeouts.indexOf(timeoutId), 1);
			currentVolumePoll();
		}, sonosDataPollInterval);

		pollTimeouts.push(timeoutId);

		return;
	}

	sonosDevice.getVolume(function(err, volume) {
		if(err || typeof(volume) === 'undefined') {
			console.log('Couldn\'t fetch volume.');
			console.log(err, volume);
			currentVolume = 0;
		} else {
			currentVolume = volume;
		}

		var timeoutId = setTimeout(function() {
			pollTimeouts.splice(pollTimeouts.indexOf(timeoutId), 1);
			currentVolumePoll();
		}, sonosDataPollInterval);

		pollTimeouts.push(timeoutId);
	});
}