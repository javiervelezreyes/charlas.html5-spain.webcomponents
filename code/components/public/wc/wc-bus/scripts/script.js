'use strict';

(function () {

	Polymer ('wc-bus', {
		
		ready: function () {			
			
			this.id     = this.getAttribute ('id');
			this.trace  = this.hasAttribute ('trace');
			this.remote = this.hasAttribute ('remote');
			this.client = Bus.client (this.id, {
				trace  : this.trace,
				remote : this.remote
			});
		}
	});

}) ();