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