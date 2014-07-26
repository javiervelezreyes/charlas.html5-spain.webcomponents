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

	var	WebcamHelper = function (component) {

		return {

			load: function () {

				var webcam   = component.state.webcam;
	            var settings = { 'video' : true,
	            				 'audio' : true };
	            
	            if (navigator.getUserMedia) {
	                navigator.getUserMedia (settings, function (stream) {
	                    webcam.src = stream;
	                    webcam.play ();
	                }, errorCb);
	            } else if (navigator.webkitGetUserMedia) { 
	                navigator.webkitGetUserMedia (settings, function (stream) {
	                    webcam.src = window.webkitURL.createObjectURL (stream);
	                    webcam.play ();
	                }, errorCb);
	            }
	            else if (navigator.mozGetUserMedia) {
	                navigator.mozGetUserMedia (settings, function(stream){
	                    webcam.src = window.URL.createObjectURL (stream);
	                    webcam.play ();
	                }, errorCb);
	            }

	            function errorCb (error) {

	                console.log('Webcam capture error - ', error.code); 
	            };
			},

			start: function () {

				component.state.webcam.play ();		
			},

			stop: function () {

				component.state.webcam.pause ();
			},

			show: function () {

				return component.state.visible = true;
			},

			hide: function () {

				return component.state.visible = false;
			},

			isVisible: function () {

				return component.state.visible;
			},

			isStopped: function () {

				return component.state.webcam.paused;
			},

			getVolume: function () {

				return Math.floor (10 * component.state.webcam.volume);
			},

			setVolume: function (volume) {

				if (component.componentHelper.isDefined (volume)) {
					     if (volume <  0)  { component.state.webcam.volume = 0; }
					else if (volume >= 10) { component.state.webcam.volume = 1;  }
					else                   { component.state.webcam.volume = volume / 10; }				
				}
			},

			isMuted: function () {

				return component.state.webcam.muted;
			},

			setMuted: function (muted) {

				component.state.webcam.muted = muted;
				component.state.muted        = muted;
			},
		};
	};

	var	EventHelper = function (component) {

		return {

			events : {

				START : 'com.webcam.start',
				STOP  : 'com.webcam.stop',
				SHOW  : 'com.webcam.show',
				HIDE  : 'com.webcam.hide'
			},

			snapshot: function () {

				var webcamHelper = component.state.webcamHelper;

				return {
					visible : component.webcamHelper.isVisible (),
					stopped : component.webcamHelper.isStopped ()
				};
			},

			before: function () {
				
				this.event = {};
				this.event.before = this.snapshot ();
			},

			after: function () {
				
				this.event.after = this.snapshot ();
				return this.event;
			}
		};
	};

	Polymer ('wc-webcam', {
		
		// DATA 

		init: function () {

			this.config = {
				name   : 'wc-webcam',
				edit   : true,
				deltas : {
					volume : 1
				},
				volume : 5,
			};

			this.state = {
				webcam  : '',
				visible : true,
				muted   : false,
			};

			this.data = {		
				title       : '',
				description : '',
				author      : {
					name    : '',
					twitter : '',
					email   : ''
				}	
			};

			this.componentHelper = ComponentHelper (this);
			this.webcamHelper    = WebcamHelper (this);
			this.eventHelper     = EventHelper (this);
		},
		
		
		// LIFECYCLE

		created: function() {
			
			this.init ();	
		},
		
		ready: function () {			
			
		},

		attached: function () {

			this.load ();
		},

		domReady: function () {

		},
		
		detached: function () {	

		},
		
		attributeChanged: function (attribute, oldValue, newValue) {		

		},
		

		// MODEL

		start: function () {

			this.eventHelper.before ();
			this.webcamHelper.start ();
			this.fireStart (this.eventHelper.after ());
		},

		stop: function () {

			this.eventHelper.before ();
			this.webcamHelper.stop ();
			this.fireStop (this.eventHelper.after ());
		},

		show: function () {

			this.eventHelper.before ();
			this.webcamHelper.show ();
			this.webcamHelper.setMuted (false);
			this.fireShow (this.eventHelper.after ());
		},

		hide: function () {

			this.eventHelper.before ();
			this.webcamHelper.hide ();
			this.webcamHelper.setMuted (true);
			this.fireHide (this.eventHelper.after ());
		},

		volume: function (volume) {

			this.eventHelper.before ();
			this.webcamHelper.setVolume (volume);
			this.fireVolume (volume, this.eventHelper.after ());
		},

		mute: function (muted) {

			if (!this.componentHelper.isDefined (muted)) {
				muted = this.webcamHelper.isMuted ();
			}
			this.eventHelper.before ();
			this.webcamHelper.setMuted (!muted);
			if (!muted && this.webcamHelper.getVolume () == 0) {
				this.webcamHelper.setVolume (this.config.volume);
			}
			this.fireMute (muted, this.eventHelper.after ());
		},


		// EVENTS: INCOMING

		onStart: function (event) {	

			this.start ();	
		},

		onStop: function (event) {

			this.stop ();		
		},

		onShow: function (event) {

			this.show ();
			this.start ();				
		},

		onHide: function (event) {

			this.stop ();
			this.hide ();				
		},

		onVolume: function (event) {

			var volume = event.data.volume;
			this.volume (volume);
		},

		onMute: function (event) {

			var muted = event.data.muted;
			this.mute (muted);				
		},


		// EVENTS: OUTGOING

		fire: function (event) {

		},

		fireStart: function (data) {

			this.fire ({
				type : this.eventHelper.events.START,
				data : data
			});
		},

		fireStop: function (data) {

			this.fire ({
				type : this.eventHelper.events.STOP,
				data : data
			});
		},

		fireShow: function (delta, data) {

			this.fire ({
				type : this.eventHelper.events.SHOW,
				data : data
			});
		},

		fireHide: function (delta, data) {

			this.fire ({
				type : this.eventHelper.events.HIDE,
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


		//CONTROLLER & LISTENERS

		doStart: function () {

			this.start ();
		},

		doStop: function () {

			this.stop ();
		},

		doOnOff: function () {

			if (this.webcamHelper.isVisible ())	this.hide ();
			else this.show ();
		},

		doMute: function () {

			this.mute ();
		},

		doVolumeUp: function (delta) {

			if (this.componentHelper.isDefined (delta)) delta = this.config.deltas.volume;
			var volume = this.webcamHelper.getVolume () + delta;
			this.volume (volume);
		},

		doVolumeDown: function (delta) {

			if (this.componentHelper.isDefined (delta)) delta = this.config.deltas.volume;
			var volume = this.webcamHelper.getVolume () - delta;
			this.volume (volume);
		},


		load: function() {

			this.config.edit         = this.hasAttribute ('edit');
			this.data.title          = this.componentHelper.getText ('title');
			this.data.description    = this.componentHelper.getText ('description');
			this.data.author.name    = this.componentHelper.getText ('author');
			this.data.author.twitter = this.componentHelper.getTagAttribute ('author', 'twitter');
			this.data.author.email   = this.componentHelper.getTagAttribute ('author', 'email');
			
			this.state.webcam        = this.$.webcam;
			this.webcamHelper.load ();

		}

	});
	
}) ();