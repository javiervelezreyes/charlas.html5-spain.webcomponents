

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