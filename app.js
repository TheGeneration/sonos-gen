var http = require('http');
var sonos = require('sonos');

const PORT = 7544;

var currentSong = 'Paused';

function handleRequest(req, res) {
	res.end(currentSong);
}

var server = http.createServer(handleRequest);

server.listen(PORT, function() {
	console.log('=== Generation Sonos Server ===');
	console.log('Server initialized and listening to port ' + PORT);
});

// var sonosDevicePollInterval = 30 * 1000;
var sonosSongPollInterval = 10 * 1000;

var sonosDevice = false;

function deviceSearchCallback(device) {
	sonosDevice = false;

	sonosDevice = device;

	currentSongPoll();
}

sonos.search(deviceSearchCallback);

function currentSongPoll() {
	sonosDevice.currentTrack(function(err, track) {
		if(err) {
			sonos.search(deviceSearchCallback);
		} else {
			currentSong = track;

			setTimeout(function() {
				currentSongPoll();
			}, sonosSongPollInterval);
		}
	});
}