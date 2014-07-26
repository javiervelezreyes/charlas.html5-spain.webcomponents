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
