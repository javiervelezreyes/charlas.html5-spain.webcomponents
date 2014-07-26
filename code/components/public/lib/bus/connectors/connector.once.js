

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