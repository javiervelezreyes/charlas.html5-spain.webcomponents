

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