var Event      = require ('./event');
var Registry   = require ('./registry');
var Connection = require ('./connection');
var Connector  = require ('./connectors/connector');
var io         = require ('socket.io');

function Channel (id, config) {

	var id       = id;
	var registry = Registry (id);
	var config   = config || {};
    var channel  = { 

    	id       : id,
    	registry : registry,
    	config   : config,
    	events   : {
    		CREATE  : 'channel.create' ,
			SEND    : 'channel.send'   ,
	        RECEIVE : 'channel.receive', 
	        REFUSE  : 'channel.refuse' ,
	        REMOVE  : 'channel.remove' ,
	        ALL     : 'channel.#'
	    },

		send: function (agent, type, data, remote) {
					
			var connections = registry.findConnectionsByEvent (type);
			var receivers   = [];
			connections.forEach (function (connection) {
				var event = Event (agent, type, data, connection);
				connection.connector.process (event);
				receivers.push (connection.agent);
			});
			if (agent !== id) {
				this.send (id, this.events.SEND, {
						sender    : agent,
						receivers : receivers,
						event     : type,
						data      : data });
			}
			if (this.config.remote && !remote) {
				var event = Event (agent, type, data);
				event.channelId = this.id;
				channel.socket.emit (this.events.SEND, event);
			}
		},

		receive: function (agent, type, connector) {
			
			var connection = Connection (agent, type, connector);
			registry.addConnection (connection);
			this.send (id, this.events.RECEIVE, {
						agent     : agent,
						event     : type,
						connector : connector.handlers });
		},

		receiveAll: function (agent, connectors) {
			
			for (var type in connectors) {
				var connector = connectors[type];
				this.receive (agent, type, connector);
			}
		},

		refuse: function (agent, type) {

			registry.removeConnection (agent, type);
			this.send (id, this.events.REFUSE, {
						agent : agent,
						event : type   });
		},

		refuseAll: function (agent) {

			var connections = registry.findConnectionsByAgent (agent);
			connections.forEach (function (connection) {
				var type = connections.type 
				refuse (agent, type);
			});
		},

		remove: function () {

			registry.remove ();
			this.send (id, this.events.REMOVE);
		}
    };

    init (config);
    return channel;

    function init (config) {

    	var trace  = config.trace;
    	var remote = config.remote;
    	
    	if (remote) {
    		channel.socket = io.connect ();
			channel.socket.emit (channel.events.CREATE,  id);
			channel.socket.on (channel.events.SEND, function (event) {
				var agent = event.sender;
				var type  = event.type;
				var data  = event.data;
				if (event.channelId === id) {
					channel.send (agent, type, data, true);
				}
			});
    	}

    	if (trace) {
    		channel.receive (channel.id, channel.events.ALL, Connector ().endpoint (function (event){
    			console.log ('Channel[%s][%s] :', channel.id,  event.type, event.data);	
    		}));
    	}

    	channel.send (channel.id, channel.events.CREATE);
    }
};

module.exports = Channel;

