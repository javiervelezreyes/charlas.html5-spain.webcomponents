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
			}
		};
	};

	var SlideHelper = function (component) {

		return {

			load: function () {
				component.state.elapsed.absolute  = 1;
				component.state.elapsed.relative  = 0;
				component.state.elapsed.formatted = this.getFormattedPosition ();
			},

			previous: function () {

				var pos = this.getPosition ();
				this.go (pos - 1);
			},

			next: function () {

				var pos = this.getPosition ();
				this.go (pos + 1);
			},

			go: function (pos) {

				var length = this.getLength ();
				if (pos < 1)      pos = 1;
				if (pos > length) pos = length;

				component.state.elapsed.absolute  = pos;
				component.state.elapsed.relative  = Math.floor (100 * pos / this.getLength ());
				component.state.elapsed.formatted = this.getFormattedPosition ();
				this.checkTimeline (pos, component.data.timeline);
			},

			getPosition: function () {

				return component.state.elapsed.absolute;
			},

			getFormattedPosition: function () {

				return component.state.elapsed.absolute + ' / ' + this.getLength ();
			},

			getLength: function () {

				return component.data.source.length;
			},

			format:  function (num) {

				var max  = this.getLength ();
				var maxl = max.toString ().length;
				var numl = num.toString ().length;
				var result = '';
				for (var index = 0; index < maxl - numl; index++) {
					result += '0'
				}
				result += num;
				return result;
			},

			getSlides : function () {

				var slides = [];
				var uri;
				for (var index = 1; index <= this.getLength (); index++) {
					uri  = component.data.source.base + '/';
					uri += component.data.source.prefix;
					uri += this.format (index) + '.';
					uri += component.data.source.ext;
					slides.push ({
						id  : index,
						uri : uri
					});
				}
				return slides;
			},

			checkTimeline: function (pos, timeline) {

				var marks = timeline.filter (function (mark) {
					return (mark.slide === pos);
				}, this);

				marks.forEach (function (mark) {

					var events  = mark.events  || [];
					var actions = mark.actions || [];

					events.forEach (function (event) {
						component.fire (event);
					}, this);

					actions.forEach (function (action) {
						var name   = action.name;
						var params = action.parameters; 
						var fn     = component[name];
						fn.apply (component, params);
					}, this);

				}, this);
			}
		};
	};

	var	EventHelper = function (component) {

		return {

			events : {

				PREVIOUS : 'com.sequenceable.previous',
				NEXT     : 'com.sequenceable.next',
				GO 		 : 'com.sequenceable.go',
			},

			snapshot: function () {

				var slideHelper = component.slideHelper;
				return {
					length  : slideHelper.getLength (),
					elapsed : {
						absolute  : component.state.elapsed.absolute,
						relative  : component.state.elapsed.relative,
						formatted : component.state.elapsed.formatted
					}
				};
			},

			before: function () {
				
				this.event = {};
				this.event.before = this.snapshot ();
			},

			after: function () {
				
				this.event.after = this.snapshot ();
				return this.event;
			},

			send: function (event) {

				var bus  = this.getBus (component);
				var chId = component.config.channelId;
				if (bus && chId) {
					var id      = component.id;
					var channel = bus.getChannel (chId);
					channel.send (id, event.type, event.data);
				}
			},

			receive: function () {

				var bus  = this.getBus (component);
				var chId = component.config.channelId;
				if (bus && chId) {
					var id        = component.id;
					var channel   = bus.getChannel (chId);
					var endpoints = {};

					endpoints[this.events.PREVIOUS] = bus.connector ().others (id).endpoint (component.onPrevious, component);
					endpoints[this.events.NEXT]     = bus.connector ().others (id).endpoint (component.onNext, component);
					endpoints[this.events.GO]       = bus.connector ().others (id).endpoint (component.onGo, component);

					channel.receiveAll (id, endpoints);
				}
			},

			refuse: function () {

				var bus  = this.getBus (component);
				var chId = component.config.channelId;
				if (bus && chId) {
					var id      = component.id;
					var channel = bus.getChannel (chId);
					channel.refuseAll (id);
				}
			},

			getBus: function (node) {

				if (node) {
					var bus = node.querySelector ('wc-bus');
					if (bus) return bus.client;
					else return this.getBus (node.parentNode);
				}
			}
		};
	};

	Polymer ('wc-slides', {
		
		// DATA 

		init: function () {

			this.config = {
				name      : 'wc-slides',
				edit      : true,
				channelId : ''
			};

			this.state = {
				elapsed : {
					absolute  : 1,
					relative  : 0,
					formatted : ''
				}
			};

			this.data = {		
				title       : '',
				description : '',
				author      : {
					name    : '',
					twitter : '',
					email   : ''
				},
				source     : {
					length : 0,
					base   : '',
					prefix : '',
					ext    : '',
					slides : []
				},
				timeline   : []
			};

			this.componentHelper = ComponentHelper (this);
			this.slideHelper     = SlideHelper (this);
			this.eventHelper     = EventHelper (this);		
		},
		
		
		// LIFECYCLE

		created: function() {
			
			this.init ();
		},
		
		ready: function () {			

		},

		attached: function () {

		},

		domReady: function () {

			this.load ();
		},
		
		detached: function () {	

		},
		
		attributeChanged: function (attribute, oldValue, newValue) {		

		},
		

		// MODEL

		previous: function () {

			this.eventHelper.before ();
			this.slideHelper.previous ();
			this.firePrevious (this.eventHelper.after ());
		},

		next: function () {

			this.eventHelper.before ();
			this.slideHelper.next ();
			this.fireNext (this.eventHelper.after ());
		},

		go: function (pos) {

			this.eventHelper.before ();
			this.slideHelper.go (pos);
			this.fireGo (pos, this.eventHelper.after ());
		},


		// EVENTS: INCOMING

		onPrevious: function (event) {

			this.slideHelper.previous ();			
		},

		onNext: function (event) {

			this.slideHelper.next ();
		},

		onGo: function (event) {

			var pos = event.data.change.position;
			this.slideHelper.go (pos);
		},

		
		// EVENTS: OUTGOING

		fire: function (event) {

			this.eventHelper.send (event);
		},

		firePrevious: function (data) {

			this.fire ({
				type : this.eventHelper.events.PREVIOUS,
				data : data
			});
		},

		fireNext: function (data) {

			this.fire ({
				type : this.eventHelper.events.NEXT,
				data : data
			});
		},

		fireGo: function (pos, data) {

			data.change = { position : pos };
			this.fire ({
				type : this.eventHelper.events.GO,
				data : data
			});
		},


		//CONTROLLER & LISTENERS

		doPrevious: function () {

			this.previous ();	
		},

		doNext: function () {

			this.next ();				
		},

		doGoStart: function () {

			this.go (0);	
		},

		doGoEnd: function () {

			var length = this.slideHelper.getLength ();
			this.go (length);			
		},

		load: function() {

			this.config.channelId    = this.getAttribute ('channel');
			this.config.edit         = this.hasAttribute ('edit');
			this.data.title          = this.componentHelper.getText ('title');
			this.data.description    = this.componentHelper.getText ('description');
			this.data.author.name    = this.componentHelper.getText ('author');
			this.data.author.twitter = this.componentHelper.getTagAttribute ('author', 'twitter');
			this.data.author.email   = this.componentHelper.getTagAttribute ('author', 'email');
			this.data.source.base    = this.componentHelper.getTagAttribute ('source', 'uri');
			this.data.source.prefix  = this.componentHelper.getTagAttribute ('source', 'prefix');
			this.data.source.ext     = this.componentHelper.getTagAttribute ('source', 'ext');
			this.data.source.length  = parseInt (this.componentHelper.getTagAttribute ('source', 'length'));
			this.data.source.slides  = this.slideHelper.getSlides ();

			this.async (function () {

				var uri = this.componentHelper.getTagAttribute ('timeline', 'uri');
				if (this.componentHelper.isDefined (uri)) {
					$(document).ready (function () {
						$.ajax ({
							url      : uri,
							dataType : 'text',
							success  : function (data) {
								this.data.timeline = JSON.parse (data);
							}.bind (this)
						});
					}.bind (this));
				}

				this.slideHelper.load ();
				if (this.hasAttribute ('listen')) {
					this.eventHelper.receive ();
				}
				
			}.bind (this));
		}

	});

}) ();
