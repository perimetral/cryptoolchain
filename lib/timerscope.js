var cb = function (callback, args) {
	var s = this; if (!(s instanceof cb)) return new cb(callback, args);
	s.callback = callback;
	s.args = args;
	s.id = tools.rnd_str(conf.timers.key_len);
	return s;
};

cb.prototype.run = function () { var s = this; s.callback(s.args); };
cb.prototype.clear = function () { var s = this; delete s.callback; delete s.args; delete s.id; };

var timeout = function (key, delay, type, cbs) {
	var s = this; if (!(s instanceof timeout)) return new timeout(key, delay, type, cbs);
	s._cb_list = {};
	s._timer = undefined;
	s._key = key;
	if (cbs) {
		for (var i in cbs) s.add_cb(cbs[i].callback, cbs[i].args);
		if (type === 'once') s.run_once(delay);
		else if (type === 'periodic') s.run_periodic(delay);
	};
	return s;
};

timeout.prototype.run_cb = function (id) { var s = this; if (id in s._cb_list) s._cb_list[id].run(); };
timeout.prototype.run_all_cb = function () { var s = this; for (var i in s._cb_list) s._cb_list[i].run(); };
timeout.prototype.del_cb = function (id) { var s = this; if (id in s._cb_list) { s._cb_list[id].clear(); delete s._cb_list[id]; }; };
timeout.prototype.del_all_cb = function () { var s = this; for (var i in s._cb_list) s.del_cb(i); };
timeout.prototype.clear = function () { var s = this;
	if (s._timer) { clearTimeout(s._timer); delete s._timer; };
	s.del_all_cb(); 
	delete s._cb_list;
	delete s._key;
};
timeout.prototype.add_cb = function (callback, args) { var s = this;
	var new_cb = new cb(callback, args);
	if (new_cb.id in s._cb_list) { s._cb_list[new_cb.id].clear(); delete s._cb_list[new_cb.id]; };
	s._cb_list[new_cb.id] = new_cb;
	return new_cb.id;
};
timeout.prototype.realize = function (clean) { var s = this; s.run_all_cb(); if (clean) s.clear(); };
timeout.prototype.run_once = function (delay) { var s = this;
	if (s._timer) clearTimeout(s._timer);
	s._timer = setTimeout(function () { s.realize(true); }, delay);
};
timeout.prototype.run_periodic = function (delay) { var s = this;
	if (s._timer) clearInterval(s._timer);
	s._timer = setInterval(function () { s.realize(false); }, delay);	
};

var scope = function () {
	var s = this; if (!(s instanceof scope)) return new scope();
	s._timers = {};
	return s;
};

scope.prototype.register = function (key, delay, type, cb_or_cbs) { var s = this;
	if (key in s._timers) s._timers[key].clear();
	if (!cb_or_cbs) s._timers[key] = new timeout(key, delay, type);
	else if (typeof(cb_or_cbs) === typeof({})) s._timers[key] = new timeout(key, delay, type, [cb_or_cbs]);
	else if (typeof(cb_or_cbs) === typeof([])) s._timers[key] = new timeout(key, delay, type, cb_or_cbs);
	return s._timers[key];
};
scope.prototype.get_timer = function (key) { var s = this; return (key in s._timers ? s._timers[key] : undefined); };
scope.prototype.clear = function () { var s = this; for (var i in s._timers) { s._timers[i].clear(); delete s._timers[i] }; };
scope.prototype.realize = function (clean) { var s = this; for (var i in s._timers) s._timers[i].realize(clean); };

module.exports = scope;