

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