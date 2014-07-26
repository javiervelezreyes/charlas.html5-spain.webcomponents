(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Channel   = require ('./channel');
var Connector = require ('./connectors/connector');

function Client (id, cfg) {

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

	//var io = require ('socket.io').listen (server);
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

Bus = BusFactory ();
module.exports = Bus;




},{"./channel":2,"./connectors/connector":5}],2:[function(require,module,exports){
var Event      = require ('./event');
var Registry   = require ('./registry');
var Connection = require ('./connection');
var Connector  = require ('./connectors/connector');
//var io         = require ('socket.io');

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


},{"./connection":3,"./connectors/connector":5,"./event":11,"./registry":14}],3:[function(require,module,exports){


function Connection (agent, type, connector) {

	var connection = {}

	connection.agent     = agent;	
	connection.type      = type;
	connection.connector = connector;

	return connection;
};

module.exports = Connection;
},{}],4:[function(require,module,exports){


module.exports = function (handler, context) {

	var handler = handler;

	return function Endpoint (event) {
		
		event.route ('endpoint');
		if (context) handler = handler.bind (context);
		handler (event);
	};
};
},{}],5:[function(require,module,exports){
var fn         = require ('fn.js');
var connectors = require ('./connectors');

var Connector = function () {

	var handlers = [];
	var self     = {};

	var bind = function (f) { 

		return function () {
			var handler = fn.apply (f, arguments);
			handlers.push (handler);
			return self;
		};
	};

	var resolve = function (f) {
		
		return function () {
			var handler   = fn.apply (f, arguments);
			var iHandlers = fn.cloneArray (handlers).reverse ();
			var oHandlers = [handler.name];

			for (var index = 0; index < iHandlers.length; index ++) {
				handler = iHandlers[index] (handler);
				oHandlers.unshift (handler.name);
			}

			return {

				handlers : oHandlers,

				process: function (event) {
					handler (event);
				}
			};
		};
		
	};

	Object.keys (connectors).forEach (function (key) {
		var connector = connectors[key];
		if (key === 'endpoint') self[key] = resolve (connector);
		else self[key] = bind (connector);
	}); 
	return self;
};

module.exports = Connector;
},{"./connectors":10,"fn.js":15}],6:[function(require,module,exports){


module.exports = function (max, next) {

	var max   = max;
	var next  = next;
	var times = 0;

	return function Max (event) {

		event.route ({
			name   : 'Max',
			max    : max,
			times  : times,
			filter : (times < max),
			next   : next.name
		});

		if (times < max) {
			next (event);
			times ++;
		}
	};
};
},{}],7:[function(require,module,exports){


module.exports = function (min, next) {

	var min   = min;
	var next  = next;
	var times = 0;

	return function Min (event) {

		event.route ({
			name   : 'Min',
			min    : min,
			times  : times,
			filter : (times >= min),
			next   : next.name
		});

		if (times >= min) {
			next (event);
		}
		else times ++;
	};
};
},{}],8:[function(require,module,exports){


module.exports = function (channel, next) {

	var channel = channel;
	var next    = next;

	return function Once (event) {

		event.route ({
			name    : 'Once',
			channel : channel,
			filter  : true,
			next    : next.name
		});
		next (event);
		channel.refuse (event.receiver, event.type);
	};
};
},{}],9:[function(require,module,exports){


module.exports = function (self, next) {

	var self = self;

	return function Others (event) {

		event.route ({
			name   : 'Others',
			selft  : self,
			next   : next.name
		});

		if (event.sender !== self) { 
			next (event);
		}
	};
};
},{}],10:[function(require,module,exports){
var fn = require ('fn.js');

var connectors = {

	min      : fn.curry (require ('./connector.min')),
	max      : fn.curry (require ('./connector.max')),
	once     : fn.curry (require ('./connector.once')),
	others   : fn.curry (require ('./connector.others')),
	endpoint : require ('./connector.endpoint')
};

module.exports = connectors;
},{"./connector.endpoint":4,"./connector.max":6,"./connector.min":7,"./connector.once":8,"./connector.others":9,"fn.js":15}],11:[function(require,module,exports){


function Event (agent, type, data, connection) {

	var event = {};

	event.timestamp = Date.now ();
	event.time      = new Date ();
	event.sender    = agent;	
	event.type      = type;
	event.data      = data || {};
	event.routes    = [];

	if (connection) {
		event.receiver = connection.agent;
		event.pattern  = connection.type
	} 

	event.route = function (route) {
		this.routes.push (route);
	};

	return event;
}

module.exports = Event;
},{}],12:[function(require,module,exports){


function AgentManager (id) {

	var id     = id;
	var agents = {};

	return {

		findConnections: function (agent) {

			return agents[agent];
		},

		addConnection: function (connection, agent) {

			if (!agents[agent]) agents[agent] = [];
			agents[agent].push (connection);
		},

		removeConnection: function (agent, type) {

			if (agents[agent]) {
				agents[agent] = agents[agent].filter (function (connection){
					return (connection.type !== type);
				});
			}
			
		},

		remove: function () {

			agents = {};
		}
	};
};

module.exports = AgentManager;
},{}],13:[function(require,module,exports){


function EventManager (id) {

	var ALL = '#';
	var SEP = '.';

	var id            = id;
	var eventManagers = {};
	var connections   = [];

	return {

		findConnections: function (type) {

			var reader  = Reader (type, SEP);
			var head    = reader.head;
			var next    = reader.next;
			var targets = [];

			if (!head) {
				return connections;
			}
			else {
				if (head === ALL) {
					for (var aType in eventManagers) {
						var eventManager = eventManagers[aType];
						if (eventManager) {
							var aConnections = eventManager.findConnections (next);
							targets = targets.concat (aConnections); 
						}
					}
					return targets;
				}
				else { 
					var eventManager    = eventManagers[head];
					var allEventManager = eventManagers[ALL];
					if (eventManager) {
						targets = targets.concat (eventManager.findConnections (next));
					}
					if (allEventManager) {
						targets = targets.concat (allEventManager.findConnections (next));
					}
					else targets = targets.concat (connections);
				}
			}
			return targets;
		},

		addConnection: function (connection, type) {

			var reader = Reader (type, SEP);
			var head   = reader.head;
			var next   = reader.next;

			if (!head) {
				connections.push (connection);
			} else {
				if (!eventManagers[head]) eventManagers[head] = EventManager (id + SEP + head);
				var eventManager = eventManagers[head];
				eventManager.addConnection (connection, next);
			}			
		},

		removeConnection: function (agent, type) {

			var reader = Reader (type, SEP);
			var head   = reader.head;
			var next   = reader.next;

			if (!head) {
				connections = connections.filter (function (connection) {
					return (connection.agent !== agent);
				});
			}
			else {
				if (eventManagers[head]){
					var eventManager = eventManagers[head];
					eventManager.removeConnection (agent, next);
				}
			}
		},

		remove: function () {

			eventManagers = {};
			connections = [];	
		}
	};
}

function Reader (type, separator) {

	if (!type) return {};
	var index = type.indexOf (separator);
	if (index > 0) {
		return {
			head: type.substring (0, index),
			next: type.slice (index + 1)
		}
	}
	return { head: type } 
}

module.exports = EventManager;
},{}],14:[function(require,module,exports){
var AgentManager = require ('./registry.agents');
var EventManager = require ('./registry.events');

function Registry (id) {

	var id           = id;
	var eventManager = EventManager (id);
	var agentManager = AgentManager (id);

	return {

		findConnectionsByEvent: function (type) {

			return eventManager.findConnections (type);
		},

		findConnectionsByAgent: function (agent) {

			return agentManager.findConnections (agent);
		},

		addConnection: function (connection) {

			agentManager.addConnection (connection, connection.agent);
			eventManager.addConnection (connection, connection.type);
		},

		removeConnection: function (agent, type) {

			agentManager.removeConnection (agent, type);
			eventManager.removeConnection (agent, type);
		},

		remove: function () {

			agentManager.remove ();
			eventManager.remove ();
		}
	};
};

module.exports = Registry;

},{"./registry.agents":12,"./registry.events":13}],15:[function(require,module,exports){
(function(root, factory) {
    if(typeof exports === 'object') {
        module.exports = factory();
    }
    else if(typeof define === 'function' && define.amd) {
        define([], factory);
    }
    else {
        root.fn = factory();
    }
}(this, function() {
'use strict';

var fn = {};

fn.toArray = function (collection) {
	return [].slice.call(collection);
};

fn.cloneArray = fn.toArray;

fn.op = {
	'+': function (value1, value2) {
		return value1 + value2;
	},
	'-': function (value1, value2) {
		return value1 - value2;
	},
	'*': function (value1, value2) {
		return value1 * value2;
	},
	'/': function (value1, value2) {
		return value1 / value2;
	},
	'==': function (value1, value2) {
		return value1 == value2;
	},
	'===': function (value1, value2) {
		return value1 === value2;
	}
};

fn.type = function (value) {
	// If the value is null or undefined, return the stringified name,
	// otherwise get the [[Class]] and compare to the relevant part of the value
	return value == null ?
		'' + value :
		({}).toString.call(value).slice(8, -1).toLowerCase();
};

fn.is = function (value, type) {
	return type === fn.type(value);
};

fn.apply = function (handler, args) {
	return handler.apply(null, args);
};

fn.concat = function () {
	var args = fn.toArray(arguments);

	return args[0].concat.apply(args[0], args.slice(1));
};

fn.partial = function () {
	var args = fn.toArray(arguments);
	var handler = args[0];
	var partialArgs = args.slice(1);

	return function () {
		return fn.apply(handler, fn.concat(partialArgs, fn.toArray(arguments)) );
	};
};

fn.curry = function (handler, arity) {
	if (handler.curried) {
		return handler;
	}

	arity = arity || handler.length;

	var curry = function curry() {
		var args = fn.toArray(arguments);

		if (args.length >= arity) {
			return handler.apply(null, args);
		}

		var inner = function () {
			return curry.apply(null, args.concat(fn.toArray(arguments)));
		};

		inner.curried = true;

		return inner;
	};

	curry.curried = true;

	return curry;
};

fn.properties = function (object) {
	var accumulator = [];

	for (var property in object) {
		if (object.hasOwnProperty(property)) {
			accumulator.push(property);
		}
	}

	return accumulator;
};

fn.each = function (handler, collection, params) {
	for (var index = 0, collectionLength = collection.length; index < collectionLength; index++) {
		fn.apply(handler, fn.concat([ collection[index], index, collection ], params));
	}
};

fn.reduce = function (handler, accumulator, collection, params) {
	fn.each(function (value, index) {
		accumulator = fn.apply(handler, fn.concat([ accumulator, value, index ], params));
	}, collection);

	return accumulator;
};

fn.filter = function (expression, collection) {
	return fn.reduce(function (accumulator, item, index) {
		expression(item, index) && accumulator.push(item);
		return accumulator;
	}, [], collection);
};

fn.op['++'] = fn.partial(fn.op['+'], 1);
fn.op['--'] = fn.partial(fn.op['+'], -1);

fn.map = function (handler, collection, params) {
	return fn.reduce(function (accumulator, value, index) {
		accumulator.push( fn.apply(handler, fn.concat([ value, index, collection ], params)) );
		return accumulator;
	}, [], collection);
};

fn.reverse = function (collection) {
	return fn.cloneArray(collection).reverse();
};

fn.pipeline = function () {
	var functions = fn.toArray(arguments);

	return function () {
		return fn.reduce(function (args, func) {
			return [ fn.apply(func, args) ];
		}, fn.toArray(arguments), functions)[0];
	};
};

fn.compose = function () {
	return fn.apply(fn.pipeline, fn.reverse(arguments));
};

fn.prop = fn.curry(function (name, object) {
	return object[name];
});

fn.merge = function () {
	return fn.reduce(function (accumulator, value) {
		fn.each(function (property) {
			accumulator[property] = value[property];
		}, fn.properties(value));

		return accumulator;
	}, {}, fn.toArray(arguments));
};

fn.memoize = function memoize(handler, serializer) {
	var cache = {};

	return function () {
		var args = fn.toArray(arguments);
		var key = serializer ? serializer(args) : memoize.serialize(args);

		return key in cache ?
			cache[key] :
			cache[key] = fn.apply(handler, args);
	};
};

fn.memoize.serialize = function (values) {
	return fn.type(values[0]) + '|' + JSON.stringify(values[0]);
};

fn.flip = function (handler) {
	return function () {
		return fn.apply(handler, fn.reverse(arguments));
	};
};

fn.delay = function (handler, msDelay) {
	return setTimeout(handler, msDelay);
};

fn.delayFor = fn.flip(fn.delay);

fn.delayed = function (handler, msDelay) {
	return function () {
		return fn.delay(fn.partial(handler, fn.toArray(arguments)), msDelay);
	};
};

fn.delayedFor = fn.flip(fn.delayed);

fn.async = fn.compose(fn.partial(fn.delayedFor, 0));

fn.throttle = function (handler, msDelay) {
	var throttling;

	return function () {
		var args = fn.toArray(arguments);

		if (throttling) {
			return;
		}

		throttling = fn.delay(function () {
			throttling = false;

			fn.apply(handler, args);
		}, msDelay);
	};
};

fn.debounce = function (handler, msDelay) {
	var debouncing;

	return function () {
		var args = fn.toArray(arguments);

		if (debouncing) {
			clearTimeout(debouncing);
		}

		debouncing = fn.delay(function () {
			debouncing = false;

			fn.apply(handler, args);
		}, msDelay);
	};
};

    return fn;
}));

},{}]},{},[1])