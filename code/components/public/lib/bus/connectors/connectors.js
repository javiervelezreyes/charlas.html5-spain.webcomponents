var fn = require ('fn.js');

var connectors = {

	min      : fn.curry (require ('./connector.min')),
	max      : fn.curry (require ('./connector.max')),
	once     : fn.curry (require ('./connector.once')),
	others   : fn.curry (require ('./connector.others')),
	endpoint : require ('./connector.endpoint')
};

module.exports = connectors;