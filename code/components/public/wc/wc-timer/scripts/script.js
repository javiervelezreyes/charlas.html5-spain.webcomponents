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

	var	TimeHelper = function (component) {

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

			dec: function (time, units) {

				if (!units) units = 1;
				var secs  = (this.toSecs (time) >= units) ? (this.toSecs (time) - units) : 0;
				var aTime = this.toTime (secs);
				this.copy (aTime, time);
			},

			inc: function (time, units) {

				if (!units) units = 1;	
				var secs  = this.toSecs (time) + units;
				var aTime = this.toTime (secs);
				this.copy (aTime, time);
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

			checkAlarm: function (state, alarm) {

				var aSecs = this.toSecs (alarm.time);
				var sSecs = this.toSecs (state.time);
				alarm.fired = (sSecs === aSecs);
				if (alarm.fired) {
					state.effect = 'alarm';
					setTimeout (function () {
						state.effect = 'none';
					}, this.MS (alarm.duration));
					if (alarm.callback) alarm.callback (state.time);
					if (!state.muted) component.$.alarm.play ();
					component.fireAlarm (alarm);
				}
			},

			checkAlarms: function (state, alarms) {

				if (state.started) {
					alarms.forEach (function (alarm) {
						this.checkAlarm (state, alarm);
					}, this);
				}
			},

			checkEnd: function (state) {

				var secs = this.toSecs (state.time);
				if (secs == 0) component.stop ();
			},		

			copy: function (source, target) {

				target.seconds = source.seconds;
				target.minutes = source.minutes;
				target.hours   = source.hours;
			},

			toString: function (time) {
				var str = [
					time.hours,
					time.minutes,
					time.seconds
				];
				return str.toString ();
			}
		};
	};
			
	var StateHelper = function (component) {

		return {

			checkView: function (state) {

				var secs  = component.timeHelper.toSecs (state.time);
				if (secs >= component.timeHelper.HOUR (1)) state.view = 'view-1';
				else state.view = 'view-2';
			},

			copy: function (source, target) {

				target.time = {};
				component.timeHelper.copy (source.time, target.time);
				target.started = source.started;
				target.view    = source.view;
				target.effect  = source.effect;
				target.muted   = source.muted;
				return target;
			}
		};
	};

	var	EventHelper = function (component) {

		return {

			events : {
				START : 'com.timer.start',
				STOP  : 'com.timer.stop',
				RESET : 'com.timer.reset',
				SET   : 'com.timer.set',
				ALARM : 'com.timer.alarm',
			},

			snapshot: function () {

				var stateHelper = component.stateHelper;
				return stateHelper.copy (component.state, {});
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

	Polymer ('wc-timer', {
		
		// DATA 

		init: function () {

			this.config = {
				name     : 'wc-timer',
				timer    : '',
				duration : 5, 
				init     : {},
				edit     : false,
			};

			this.state = {
				time : {
					hours   : 0,
					minutes : 0,
					seconds : 0	
				},
				started : false,
				view    : 'view-1',
				effect  : 'none',
				muted   : true
			};

			this.data = {
				title  : '',
				alarms : [],
				time   : {
					hours   : 0,
					minutes : 0,
					seconds : 0	
				}
			};

			this.componentHelper = ComponentHelper (this);
			this.timeHelper      = TimeHelper (this);
			this.stateHelper     = StateHelper (this);
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

			if (!this.state.started) {
				this.eventHelper.before ();
				this.config.timer = setInterval (function () {
					this.dec ();
				}.bind (this), 1000);
				this.state.started = true;
				this.fireStart (this.eventHelper.after ());
			}
		},

		stop: function () {

			if (this.state.started) {
				this.eventHelper.before ();
				clearInterval (this.config.timer);
				this.state.started = false;
				this.fireStop (this.eventHelper.after ());
			}
		},

		reset: function () {

			this.stop ();
			this.eventHelper.before ();
			this.timeHelper.copy (this.data.time, this.state.time);
			this.stateHelper.copy (this.config.init, this.state);
			this.fireReset (this.eventHelper.after ());
		},

		set: function (time) {

			var aTime;
			if (typeof time === 'string') aTime = this.timeHelper.read (time);
			if (typeof time === 'number') aTime = this.timeHelper.toTime (time);
			if (typeof time === 'object') aTime = time;
			this.eventHelper.before ();
			this.timeHelper.copy (aTime, this.state.time); 
			this.fireSet (aTime, this.eventHelper.after ());

		},

		inc: function (secs) {

			this.timeHelper.inc (this.state.time, secs);
			this.timeHelper.checkAlarms (this.state, this.data.alarms);
			this.stateHelper.checkView (this.state);
			this.timeHelper.checkEnd (this.state);
		},

		dec: function (secs) {

			this.timeHelper.dec (this.state.time, secs);
			this.timeHelper.checkAlarms (this.state, this.data.alarms);
			this.stateHelper.checkView (this.state);
			this.timeHelper.checkEnd (this.state);
		},

		alarm: function(time, callback, duration) {

			var aTime;
			if (typeof time === 'string') aTime = this.timeHelper.read (time);
			if (typeof time === 'number') aTime = this.timeHelper.toTime (time);
			if (typeof time === 'object') return time;
			this.data.alarms.push ({
				time     : aTime,
				fired    : false,
				callback : callback,
				duration : duration || this.config.duration
			});
		},


		// EVENTS: INCOMING

		onStart: function (event) {

			this.start ();
		},

		onStop: function (event) {	

			this.stop ();
		},

		onReset: function (event) {	

			this.reset ();	
		},

		onSet: function (event) {	

			var time = event.data.time;
			this.set (time);	
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

		fireReset: function (data) {	

			this.fire ({
				type : this.eventHelper.events.RESET,
				data : data
			});
		},

		fireSet: function (time, data) {	

			data.change = { time : time };
			this.fire ({
				type : this.eventHelper.events.SET,
				data : data
			});
		},

		fireAlarm: function (alarm) {	
		
			this.fire ({
				type : this.eventHelper.events.ALARM,
				data : alarm
			});	
		},


		//CONTROLLER & LISTENERS

		doStart: function() {

			this.start ();
		},

		doStop: function() {

			this.stop ();
		},

		doReset: function() {

			this.reset ();
		},

		doHourUp: function () {

			this.stop ();
			this.inc (this.timeHelper.HOUR (1));
		},

		doHourDown: function () {

			this.stop ();
			this.dec (this.timeHelper.HOUR (1));
		},

		doMinUp: function () {

			this.stop ();
			this.inc (this.timeHelper.MIN (1));
		},

		doMinDown: function () {

			this.stop ();
			this.dec (this.timeHelper.MIN (1));
		},

		doSecUp: function () {

			this.stop ();
			this.inc (this.timeHelper.SEC (1));
		},

		doSecDown: function () {

			this.stop ();
			this.dec (this.timeHelper.SEC (1));
		},

		doMute: function () {

			this.state.muted = !this.state.muted;
		},


		load: function () {
		
			this.config.edit = this.hasAttribute ('edit');
	        this.data.title  = this.componentHelper.getText ('title');
			this.data.time   = this.timeHelper.read (this.time);
			this.timeHelper.copy  (this.data.time, this.state.time);
			this.stateHelper.copy (this.state, this.config.init);
			this.stateHelper.checkView (this.state);
			
			this.alarm (this.timeHelper.MIN (1));
			this.alarm (this.timeHelper.SEC (5));
			var timers = this.componentHelper.getTags ('alarm');
			for (var index = 0; index < timers.length; index++) {
				var aTimer = timers [index];
				var aTime  = aTimer.getAttribute ('time');
				this.alarm (aTime);
			}

			this.timeHelper.checkAlarms (this.state, this.data.alarms);
		}

	});

}) ();


