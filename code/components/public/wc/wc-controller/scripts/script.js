'use strict';

(function () {

	var ComponentHelper = function (component) {

		return {

			isDefined: function (attribute) {

				return (attribute !== null) &&
					   (attribute !== undefined);
			},

			getTag: function (name) {

				var tag = component.config.name + '-' + name;
				return component.querySelector (tag);
			},

			getTags: function (name) {

				var tag = component.config.name + '-' + name;
				return component.querySelectorAll (tag);
			},

			getText: function (tag) {

				if (this.isDefined (tag) &&
					this.isDefined (this.getTag (tag))) {
					return this.getTag (tag).textContent;
				}
				else return '';
			},

			getTagAttribute: function (tag, name) {

				if (this.isDefined (tag) &&
					this.isDefined (this.getTag (tag))) {
					return this.getTag (tag).getAttribute (name);
				}
			},

			getAllTagAttributes: function (tag, name) {

				if (this.isDefined (tag) &&
					this.isDefined (this.getTags (tag))) {
					var tags = this.getTags (tag); 
					var attributes = [];
					for (var index = 0; index < tags.length; index ++) {
						var tag = tags[index];
						attributes.push (tag.getAttribute (name));
					}
					return attributes;
				}
			}
		};	
	};

	Polymer ('wc-controller', {
		
		// DATA 

		init: function () {

			this.config = {
				name : 'wc-controller',
			};

			this.state = {
				agents : [],
				agent  : 0,
				round  : 0
			};

			this.data = {
				agents    : [],
				shiftTime : 10
			};

			this.componentHelper = ComponentHelper (this);
		},
		
		
		// LIFECYCLE

		created: function() {
			
			this.init (); 
		},
		
		ready: function () {

			this.load ();			
		},

		attached: function () {

		},

		domReady: function () {

		},
		
		detached: function () {	

		},
		
		attributeChanged: function (attribute, oldValue, newValue) {		

		},
		

		// MODEL

		start: function () {

			this.state.agents[this.state.agent].play ();
			this.state.round = setInterval (function () {
				this.state.agents[this.state.agent].stop();
				this.state.agent = (this.state.agent + 1) % this.state.agents.length;
				this.state.agents[this.state.agent].play();			
			}.bind (this), this.data.shiftTime * 1000);
			
		},

		stop: function () {

			this.state.agents[this.state.agent].stop();
			clearInterval (this.state.round);
		},


		// EVENTS: INCOMING


		// EVENTS: OUTGOING


		//CONTROLLER & LISTENERS

		doStart: function () {

			this.start ();
		},

		doStop: function () {
			
			this.stop ();
		},

		load: function() {

			this.data.agents    = this.componentHelper.getAllTagAttributes ('agent', 'ref');
			this.data.shiftTime = this.getAttribute ('shift');
			this.state.agents   = [];
			for (var index = 0; index < this.data.agents.length; index ++) {
				var agent   = this.data.agents[index];
				var wcAgent = document.querySelector ('#' + agent);
				this.state.agents.push (wcAgent);
			}
		}
	});
	
}) ();