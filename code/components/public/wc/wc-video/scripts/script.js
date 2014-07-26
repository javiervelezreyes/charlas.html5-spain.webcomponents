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
		
	var VideoHelper = function (component) {

		return {

			load: function () {

				component.state.video.load ();
				component.state.muted = this.isMuted ();
				this.setVolume (component.config.volume);
				component.state.video.addEventListener ('timeupdate', function () {
					var time = this.getTime ();	
					component.state.elapsed.absolute  = Math.floor (time);
					component.state.elapsed.relative  = Math.floor (100 * time / this.getLength ()) ;
					component.state.elapsed.formatted = this.getFormattedTime ();
					this.checkTimeline (Math.floor (time), component.data.timeline);
					component.fireTime (time);
				}.bind(this));

				component.state.timelineMark = 0;
			},

			play: function () {

				if (this.getTime () >= this.getLength ()) {
					this.setTime (0);
				}
				component.state.video.play ();
			},

			stop: function () {

				component.state.video.pause ();
			},

			getVolume: function () {

				return Math.floor (10 * component.state.video.volume);
			},

			setVolume: function (volume) {

				if (component.componentHelper.isDefined (volume)) {
					     if (volume <  0)  { component.state.video.volume = 0;           }
					else if (volume >= 10) { component.state.video.volume = 1;           }
					else                   { component.state.video.volume = volume / 10; }				
				}
			},

			isMuted: function () {

				return component.state.video.muted;
			},

			setMuted: function (muted) {

				component.state.video.muted = muted;
				component.state.muted       = muted;
			},

			getTime: function () {

				return component.state.video.currentTime;
			},

			setTime: function (time) {

				if (component.componentHelper.isDefined (time)) {
					var length = this.getLength ();
					var targetTime;
					     if (time < 0)      { targetTime = 0;      }
					else if (time > length) { targetTime = length; } 
					else                    { targetTime = time;   }

					if (targetTime < component.state.video.currentTime) {
						component.state.video.currentTime = targetTime;
						component.state.timelineMark = this.getTimeLineMark (targetTime, component.data.timeline);
					}
					component.state.video.currentTime = targetTime;
				} 
			},

			getRemainingTime: function () {

				return this.getLength () - this.getTime ();
			},

			getFormattedTime: function () {

				var eTime = component.timeHelper.toTime (Math.floor (this.getTime ()));
				var tTime = component.timeHelper.toTime (Math.floor (this.getLength ()));
				return component.timeHelper.toString (eTime) + ' / ' + 
					   component.timeHelper.toString (tTime);
			},
			
			getLength: function () {

				return component.state.video.duration;
			},

			isStopped: function () {

				return component.state.video.paused;
			},

			checkTimeline: function (time, timeline) {

				if (timeline) {
					var marks = timeline.filter (function (mark) {
						var tMark = component.timeHelper.read (mark.time);
						var sMark = component.timeHelper.toSecs (tMark);
						return (sMark <= time);
					}, this);

					marks.forEach (function (mark) {

						var events  = mark.events  || [];
						var actions = mark.actions || [];

						var tMark = component.timeHelper.read (mark.time);
						var sMark = component.timeHelper.toSecs (tMark);
						if (component.state.timelineMark < sMark) {
							component.state.timelineMark = sMark;
							events.forEach (function (event) {
								component.fire (event);
							}, this);

							actions.forEach (function (action) {
								var name   = action.name;
								var params = action.parameters; 
								var fn     = component[name];
								fn.apply (component, params);
							}, this);
						}
						
					}, this);
				}
			},

			getTimeLineMark: function (time, timeline) {

				var timelineMark = 0;
				for (var index = 0; index < timeline.length; index++) {
					var mark = timeline[index].time;
					if ((mark > timelineMark) && 
						(mark < time)) timelineMark = mark;
				}
				return timelineMark;
			}
		};
	};

	var TimeHelper = function (component) {

		return {

			HOUR : function (n) { return 60 * this.MIN (n); },
			MIN  : function (n) { return 60 * this.SEC (n); },
			SEC  : function (n) { return n;                 },
			MS   : function (n) { return 1000 * n;          },

			read: function (str) {

			    var time = JSON.parse ('["' + str.replace (':', '","')
					 	                         .replace (':', '","') 
					 	                    + '"]').reverse ();
			    return this.normalize ({
			    	seconds : time[0] ? parseInt (time[0]) : 0,
			    	minutes : time[1] ? parseInt (time[1]) : 0,
			    	hours   : time[2] ? parseInt (time[2]) : 0
			    });
			},

			normalize: function (time) {

				return {
					seconds : time.seconds % 60,
					minutes : time.minutes % 60 + Math.floor (time.seconds / 60),
					hours   : time.hours        + Math.floor (time.minutes / 60)
				};
			},

			toSecs : function (time) {

				return ((time.hours   > 0) ? this.HOUR (1) * time.hours   : 0) +
					   ((time.minutes > 0) ? this.MIN  (1) * time.minutes : 0) +
					   ((time.seconds > 0) ? this.SEC  (time.seconds)     : 0);
			},

			toTime : function (secs) {

				if (secs > 0) {
					var time = {};
					if (secs > this.HOUR (1)) { time.hours   = Math.floor (secs / this.HOUR (1)); secs %= this.HOUR (1); } else { time.hours   = 0 }; 
					if (secs > this.MIN  (1)) { time.minutes = Math.floor (secs / this.MIN  (1)); secs %= this.MIN  (1); } else { time.minutes = 0 }; 
					if (secs > 0            ) { time.seconds = secs; }                                                     else { time.seconds = 0 }; 
					return this.normalize (time);
				}
				else {
					return {
						seconds : 0,
						minutes : 0,
						hours   : 0
					};
				}
			},
		
			copy: function (source, target) {

				target.seconds = source.seconds;
				target.minutes = source.minutes;
				target.hours   = source.hours;
			},

			toString: function (time) {
				var str = '';
				if (time.hours   > 0) str += time.hours + ':';
				str += time.minutes + ':';
				str += time.seconds;
				return str;
			}
		};
	};

	var EventHelper = function (component) {

		return {

			events : {
				PLAY     : 'com.playable.play',
				STOP     : 'com.playable.stop',
				BACKWARD : 'com.playable.backward',
				FORWARD  : 'com.playable.forward',
				GO       : 'com.playable.go',
				VOLUME   : 'com.playable.volume',
				MUTE     : 'com.playable.mute',
				TIME     : 'com.playable.time'
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

					endpoints[this.events.PLAY]     = bus.connector ().others (id).endpoint (component.onPlay, component);
					endpoints[this.events.STOP]     = bus.connector ().others (id).endpoint (component.onStop, component);
					endpoints[this.events.BACKWARD] = bus.connector ().others (id).endpoint (component.onBackward, component);
					endpoints[this.events.FORWARD]  = bus.connector ().others (id).endpoint (component.onForward, component);
					endpoints[this.events.GO]       = bus.connector ().others (id).endpoint (component.onGo, component);
					endpoints[this.events.VOLUME]   = bus.connector ().others (id).endpoint (component.onVolume, component);
					endpoints[this.events.MUTE]     = bus.connector ().others (id).endpoint (component.onMute, component);
					endpoints[this.events.TIME]     = bus.connector ().others (id).once (channel).endpoint (component.onTime, component);

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

	Polymer ('wc-video', {
		
		// DATA 

		init: function () {

			this.config = {
				name      : 'wc-video',
				deltas    : {
					video   : 5,
					volume  : 1
				},
				volume    : 5,
				edit      : true,
				channelId : ''
			};

			this.state = {
				video   : '',
				muted   : false,
				elapsed : {
					absolute  : 0,
					relative  : 0,
					formatted : ''
				},
				timelineMark : 0
			};

			this.data = {		
				title       : '',
				description : '',
				author      : {
					name    : '',
					twitter : '',
					email   : ''
				},
				sources     : [],
				timeline    : []		
			};

			this.componentHelper = ComponentHelper (this);
			this.videoHelper     = VideoHelper (this);
			this.timeHelper      = TimeHelper (this);
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

		play: function () {

			this.eventHelper.before ();
			this.videoHelper.play ();
			this.firePlay (this.eventHelper.after ());
		},

		stop: function () {

			this.eventHelper.before ();
			this.videoHelper.stop ();
			this.fireStop (this.eventHelper.after ());
		},

		backward: function (delta) {

			this.eventHelper.before ();
			var time = this.videoHelper.getTime ();
			this.videoHelper.setTime (time - delta);
			this.fireBackward (delta, this.eventHelper.after ());
		},

		forward: function (delta) {

			this.eventHelper.before ();
			var time = this.videoHelper.getTime ();
			this.videoHelper.setTime (time + delta);
			this.fireForward (delta, this.eventHelper.after ());
		},

		go: function (time) {

			if (typeof (time) === 'string') {
				time = this.timeHelper.read (time);
				time = this.timeHelper.toSecs (time);
			}
			this.eventHelper.before ();
			this.videoHelper.setTime (time);
			this.fireGo (time, this.eventHelper.after ());
		},

		volume: function (volume) {

			this.eventHelper.before ();
			this.videoHelper.setVolume (volume);
			this.fireVolume (volume, this.eventHelper.after ());
		},

		mute: function (muted) {

			if (!this.componentHelper.isDefined (muted)) {
				muted = this.videoHelper.isMuted ();
			}
			this.eventHelper.before ();
			this.videoHelper.setMuted (!muted);
			if (!muted && this.videoHelper.getVolume () == 0) {
				this.videoHelper.setVolume (this.config.volume);
			}
			this.fireMute (muted, this.eventHelper.after ());
		},


		// EVENTS: INCOMING

		onPlay: function (event) {	

			this.videoHelper.play ();
		},

		onStop: function (event) {

			this.videoHelper.stop ();
		},

		onBackward: function (event) {

			var delta = event.data.change.delta;
			var time  = this.videoHelper.getTime ();
			this.videoHelper.setTime (time - delta);
		},

		onForward: function (event) {

			var delta = event.data.change.delta;
			var time  = this.videoHelper.getTime ();
			this.videoHelper.setTime (time + delta);	
		},

		onGo: function (event) {

			var time = event.data.change.time;
			if (typeof (time) === 'string') {
				time = this.timeHelper.read (time);
				time = this.timeHelper.toSecs (time);
			}
			this.videoHelper.setTime (time);			
		},
		
		onVolume: function (event) {

			var volume = event.data.change.volume;
			this.videoHelper.setVolume (volume);
		},

		onMute: function (event) {

			var muted = event.data.change.muted;
			if (!this.componentHelper.isDefined (muted)) {
				muted = this.videoHelper.isMuted ();
			}
			this.videoHelper.setMuted (!muted);
			if (!muted && this.videoHelper.getVolume () == 0) {
				this.videoHelper.setVolume (this.config.volume);
			}		
		},

		onTime: function (event) {

			this.onGo (event);
			if ((event.data.change.time > 0) && this.videoHelper.isStopped ()) {
				this.videoHelper.play ();
			}		
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


		//CONTROLLER & LISTENERS

		doPlay: function () {

			this.play ();
		},

		doStop: function () {

			this.stop ();
		},

		doBackward: function () {

			var delta = this.config.deltas.video;
			this.backward (delta);	
		},

		doForward: function () {

			var delta = this.config.deltas.video;
			this.forward (delta);				
		},

		doGoStart: function () {

			this.stop ();
			this.go (0);	
		},

		doGoEnd: function () {

			var length = this.videoHelper.getLength ();
			this.stop ();
			this.go (length);			
		},

		doMute: function () {

			this.mute ();
		},

		doVolumeUp: function (delta) {

			if (this.componentHelper.isDefined (delta)) delta = this.config.deltas.volume;
			var volume = this.videoHelper.getVolume () + delta;
			this.volume (volume);
		},

		doVolumeDown: function (delta) {

			if (this.componentHelper.isDefined (delta)) delta = this.config.deltas.volume;
			var volume = this.videoHelper.getVolume () - delta;
			this.volume (volume);
		},


		load: function() {

			this.config.edit         = this.hasAttribute ('edit');
			this.data.title          = this.componentHelper.getText ('title');
			this.data.description    = this.componentHelper.getText ('description');
			this.data.author.name    = this.componentHelper.getText ('author');
			this.data.author.twitter = this.componentHelper.getTagAttribute ('author', 'twitter');
			this.data.author.email   = this.componentHelper.getTagAttribute ('author', 'email');
			this.config.channelId    = this.getAttribute ('channel');

			this.async (function () {
						
				var sourceTags = this.componentHelper.getTags ('source');
				for (var index = 0; index < sourceTags.length; index ++) {
					var sourceTag  = sourceTags[index];
					var sourceUri  = sourceTag.getAttribute ('uri');
					var sourceType = sourceTag.getAttribute ('type');

					this.data.sources.push ({
						uri  : sourceUri,
						type : sourceType
					});
				}

				this.state.video = this.$.video;
				this.videoHelper.load ();

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

				if (this.hasAttribute ('listen')) {
					this.eventHelper.receive ();
				}

			}.bind (this));
		}

	});
	
}) ();