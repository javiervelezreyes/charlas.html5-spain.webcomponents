var Channel   = require ('./channel');
var Connector = require ('./connectors/connector');

var Bus = function Client (id, cfg) {

	var id       = id;
	var channels = {};

	return {

		getChannel: function (channelId, config) {
			
			if (!(channelId in channels)) {
				channels[channelId] = Channel (channelId, config || cfg);
			}
			return channels[channelId];
		},

		getChannels: function () {

			var channelIds = Object.keys (channels);
			return channelIds.map (function (channelId) {
	    		return channels[channelId];
			});
		},

		hasChannel: function (channelId) {

			return (channelId in channels);
		},

		hasChannels: function () {

			return (Object.keys (channels).length > 0);
		},

		removeChannel: function (channelId) {
			
			channels[channelId].remove ();
			delete channels[channelId];
		},

		removeChannels: function (channelId) {
			
			var channelIds = Object.keys (channels);
			channelIds.forEach (function (channelId) {
	    		removeChannel (channelId);
			});
		},

		remove: function () {

			for (var channel in channels) {
				channel.remove ();
			}
			channels = {};
		},

		connector: Connector

	};
}

function Server (server) {

	var io = require ('socket.io').listen (server);
	io.set ('log level', 1);
	
	io.sockets.on ('connection', function (socket) {

    	var events = {
    		CREATE  : 'channel.create' ,
			SEND    : 'channel.send'   ,
	        RECEIVE : 'channel.receive', 
	        REFUSE  : 'channel.refuse' ,
	        REMOVE  : 'channel.remove' ,
	        ALL     : 'channel.#'
	    };
		
		socket.on (events.CREATE, function (channelId) {

	        socket.join (channelId);         	       
	    });

	    socket.on (events.SEND, function (event) {
    
	        socket.broadcast.to (event.channelId).emit (events.SEND, event);
	    });

		socket.on (events.REMOVE, function(channelId) {  
     
	        socket.leave (channelId);
	    });
	});

	io.sockets.on ('disconnect', function (socket) {

	});
}

var BusFactory = function () {

	return {

		client: function (id, config) {

			return Client (id, config);
		},

		server: function (server) {

			return Server (server);
		}
	};
};

module.exports = BusFactory ();



