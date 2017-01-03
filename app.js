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

function handleRequest(req, res) {
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.end(JSON.stringify({
		'track': currentTrack,
		'state': currentState
	}));
}

var server;

if(process.env.USE_SSL) {
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
var sonosDataPollInterval = 1000 * 15;

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
	if(sonosDevice === false || typeof sonosDevice.currentTrack !== 'function') {
		sonos.search(deviceSearchCallback);
		currentTrack = {};
		return;
	}

	sonosDevice.currentTrack(function(err, track) {
		if(err || typeof(track.title) === 'undefined') {
			console.log('Couldn\'t fetch track title. Searching for SONOS device again.');
			console.log(err, track);
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
	if(sonosDevice === false || typeof sonosDevice.getCurrentState !== 'function') {
		sonos.search(deviceSearchCallback);
		currentState = 'stopped';
		return;
	}

	sonosDevice.getCurrentState(function(err, state) {
		if(err || typeof(state) === 'undefined') {
			console.log('Couldn\'t fetch track state. Searching for SONOS device again.');
			console.log(err, state);
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