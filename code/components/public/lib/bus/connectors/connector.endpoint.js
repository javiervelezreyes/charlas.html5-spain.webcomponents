

module.exports = function (handler, context) {

	var handler = handler;

	return function Endpoint (event) {
		
		event.route ('endpoint');
		if (context) handler = handler.bind (context);
		handler (event);
	};
};