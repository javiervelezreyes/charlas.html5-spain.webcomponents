

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