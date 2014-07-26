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

	var EventHelper = function (component) {

		return {

			events: {

				PLAYABLE     : 'com.playable.#',
				SEQUENCEABLE : 'com.sequenceable.#',
				ZOOM_IN      : 'com.container.zoom.in',
				ZOOM_OUT     : 'com.container.zoom.out'
			},

			snapshot: function () {

				var videoHelper = component.videoHelper;
				return {
					time    : videoHelper.getTime (),
					length  : videoHelper.getLength (),
					stopped : videoHelper.isStopped (),
					volume  : videoHelper.getVolume (),
					muted   : videoHelper.isMuted (),
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

				var bus  = this.getOuterBus (component);
				var chId = component.config.channel.outer;
				if (bus && chId) {
					var id      = component.id;
					var channel = bus.getChannel (chId);
					channel.send (id, event.type, event.data);
				}
			},

			receive: function () {

				var inBus      = this.getInnerBus ();
				var outBus     = this.getOuterBus (component);
				var inChannel  = inBus.getChannel (component.config.channel.inner);
				var outChannel = outBus.getChannel (component.config.channel.outer);
				var id         = component.id;

				var redirectTo = function (channel) {
					return function (event) {
						channel.send (id, event.type, event.data);
					}
				};

				var zoomIn  = function (event) { component.state.zoom = true;  };
				var zoomOut = function (event) { component.state.zoom = false; };

				if (inChannel && outChannel) {
					var inEndpoints = {};
					inEndpoints[this.events.PLAYABLE]     = inBus.connector ().others (id).endpoint (redirectTo (outChannel), component);
					inEndpoints[this.events.SEQUENCEABLE] = inBus.connector ().others (id).endpoint (redirectTo (outChannel), component);
					inEndpoints[this.events.ZOOM_IN]      = inBus.connector ().others (id).endpoint (zoomIn, component);
					inEndpoints[this.events.ZOOM_OUT]     = inBus.connector ().others (id).endpoint (zoomOut, component);

					inChannel.receiveAll (id, inEndpoints);
					outChannel.receive (id, this.events.PLAYABLE, outBus.connector ().others (id).endpoint (redirectTo (inChannel), component));
				}
			},

			refuse: function () {

				var inBus      = this.getInnerBus ();
				var outBus     = this.getOuterBus (component);
				var inChannel  = inBus.getChannel (component.config.channel.inner);
				var outChannel = outBus.getChannel (component.config.channel.outer);
				if (inChannel)  inChannel.refuseAll (component.id);
				if (outChannel) outChannel.refuseAll (component.id);
			},

			getInnerBus: function (node) {

				var bus = component.$['com.agora.speech'];
				if (bus) return bus.client;
			},

			getOuterBus: function (node) {

				if (node) {
					var bus = node.querySelector ('wc-bus');
					if (bus) return bus.client;
					else return this.getOuterBus (node.parentNode);
				}
			}
		};
	};

	Polymer ('wc-speech', {
		
		// DATA 

		init: function () {

			this.config = {
				name    : 'wc-speech',
				channel : {
					inner : '',
					outer : ''
				}
			};

			this.state = {
				talk : {},
				zoom : false  
			};

			this.data = {		
				title       : '',
				description : '',
				author      : {
					name    : '',
					twitter : '',
					email   : ''
				},
				logo        : '',
				talk        : {},
				timeline    : '',
				notes       : {}		
			};

			this.componentHelper = ComponentHelper (this);
			this.eventHelper     = EventHelper (this);
		},
		
		
		// LIFECYCLE

		created: function() {
			
			this.init ();
			this.load ();
		},
		
		ready: function () {			
					
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

		play: function () {

			this.eventHelper.before ();
			this.state.talk.play ();
			this.firePlay (this.eventHelper.after ());
		},

		stop: function () {

			this.eventHelper.before ();
			this.state.talk.stop ();
			this.fireStop (this.eventHelper.after ());
		},

		backward: function (delta) {

			this.eventHelper.before ();
			this.state.talk.backward (delta);
			this.fireBackward (delta, this.eventHelper.after ());
		},

		forward: function (delta) {

			this.eventHelper.before ();
			this.state.talk.forward (delta);
			this.fireForward (delta, this.eventHelper.after ());
		},

		go: function (time) {

			this.eventHelper.before ();
			this.state.talk.go (time);
			this.fireGo (time, this.eventHelper.after ());
		},

		volume: function (volume) {

			this.eventHelper.before ();
			this.state.talk.volume (volume);
			this.fireVolume (volume, this.eventHelper.after ());
		},

		mute: function (muted) {

			this.eventHelper.before ();
			this.state.talk.mute (muted);
			this.fireMute (muted, this.eventHelper.after ());
		},		

		// EVENTS: OUTGOING

		fire: function (event) {

			this.eventHelper.send (event);
		},

		firePlay: function (data) {

			this.fire ({
				type : this.eventHelper.events.PLAY,
				data : data
			});
		},

		fireStop: function (data) {

			this.fire ({
				type : this.eventHelper.events.STOP,
				data : data
			});
		},

		fireBackward: function (delta, data) {

			data.change = { delta : delta };
			this.fire ({
				type : this.eventHelper.events.BACKWARD,
				data : data
			});
		},

		fireForward: function (delta, data) {

			data.change = { delta : delta };
			this.fire ({
				type : this.eventHelper.events.FORWARD,
				data : data
			});
		},

		fireGo: function (time, data) {

			data.change = { time : time };
			this.fire ({
				type : this.eventHelper.events.GO,
				data : data
			});
		},

		fireVolume: function (volume, data) {

			data.change = { volume : volume };
			this.fire ({
				type : this.eventHelper.events.VOLUME,
				data : data
			});
		},

		fireMute: function (muted, data) {

			data.change = { muted : muted };
			this.fire ({
				type : this.eventHelper.events.MUTE,
				data : data
			});
		},

		fireTime: function (time, data) {

			if (!this.componentHelper.isDefined (data)) data = {};
			data.change = { time : time };
			this.fire ({
				type : this.eventHelper.events.TIME,
				data : data
			});
		},


		load: function() {

			this.data.title          = this.componentHelper.getText ('title');
			this.data.description    = this.componentHelper.getText ('description');
			this.data.author.name    = this.componentHelper.getText ('author');
			this.data.author.twitter = this.componentHelper.getTagAttribute ('author', 'twitter');
			this.data.author.email   = this.componentHelper.getTagAttribute ('author', 'email');
			this.data.logo           = this.componentHelper.getTagAttribute ('logo', 'uri');
			this.data.front          = this.componentHelper.getTagAttribute ('front', 'uri');
			this.data.talk.uri       = this.componentHelper.getTagAttribute ('talk', 'uri');
			this.data.talk.type      = this.componentHelper.getTagAttribute ('talk', 'type');
			this.data.timeline       = this.componentHelper.getTagAttribute ('timeline', 'uri');
			this.data.notes.uri      = this.componentHelper.getTagAttribute ('notes', 'uri');
			this.data.notes.prefix   = this.componentHelper.getTagAttribute ('notes', 'prefix');
			this.data.notes.length   = this.componentHelper.getTagAttribute ('notes', 'length');
			this.data.notes.ext      = this.componentHelper.getTagAttribute ('notes', 'ext');

			this.async (function () {

				this.config.channel.inner = this.$.talk.getAttribute ('channel');
				this.config.channel.outer = this.getAttribute ('channel'); 
				this.state.talk           = this.$.talk;

				if (this.hasAttribute ('listen')) {
					this.eventHelper.receive ();
				}
				
			}.bind (this));
		}

	});
	
}) ();