const Linvo = require('linvodb3');
const leveldown = require('leveldown');
const path = require('path');

Linvo.defaults.store = { db: leveldown };

const convertCall = function (db, method) {
	if (method === 'remove') return function (what) {
		return new Promise(function (go, stop) {
			db.remove(what, { multi: true }, function (e, result) { if (e) return stop(e); go(result); });
		});
	}; else return function (what) {
		return new Promise(function (go, stop) {
			db[method](what, function (e, result) { if (e) return stop(e); go(result); });
		});
	};
};

var Weedb = function (config) { var s = this;
	if (!(s instanceof Weedb)) return new Weedb(config);
	config = config || {};
	config.path = config.path || '../db';
	config.name = config.name || 'default';
	config.schema = config.schema || {};
	config.filename = config.filename || path.join(config.path, config.name + '.wdb');

	Linvo.dbPath = config.path;
	var db = new Linvo(config.name, config.schema, { filename: config.filename, store: { db: leveldown } });
	db.static('psave', (element) => {
		return new Promise((go, stop) => {
			element.save((e) => {
				if (e) { _c(e); return stop(e); };
				return go(element);
			});
		});
	});

	s.insert = convertCall(db, 'insert');
	s.save = convertCall(db, 'save');
	s.findMultiple = convertCall(db, 'find');
	s.find = convertCall(db, 'findOne');
	s.remove = convertCall(db, 'remove');
	s.count = convertCall(db, 'count');

	return s;
};

module.exports = Weedb;