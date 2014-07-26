

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