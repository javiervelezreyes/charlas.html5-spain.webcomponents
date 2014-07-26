

function Connection (agent, type, connector) {

	var connection = {}

	connection.agent     = agent;	
	connection.type      = type;
	connection.connector = connector;

	return connection;
};

module.exports = Connection;