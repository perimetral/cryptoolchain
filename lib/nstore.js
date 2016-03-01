const _c = console.log;
const _t = require('./tools');
const os = require('os');
const path = require('path');

const _rs = function (length) { return (Math.random() * 10 * length).toString(); };
const _dummy = function (x) { return x; };

const E_TYPE = { DIR_UNRESOLVED: -78 };

const tryOpen = function (dbName, dbPath) {
	
};

var nstore = function (config) { var s = this;
	if (!(s instanceof nstore)) return new nstore(config);
	config = config || {};
	var dbName = config.name || _rs(15);
	var dbPath = config.path || '../db';
	tryOpen(dbName, dbPath);

	config.encryptor = config.encryptor || _dummy;
	config.decryptor = config.decryptor || _dummy;
	config.mBlockSize = config.mBlockSize || 4 * 1024 * 1024;
	config.blockSize = config.blockSize || 4 * 1024;
	s.config = config;

	if (!_t.checkDir(path.parse(config.path).dir, config.path)) return E_TYPE.DIR_UNRESOLVED;

	return s;
};

nstore.prototype.write = function ()

	const lowModel = {
		storage: {
			read: function (source, parser) {},
			write: function (destination, obj, serializer) {}
		},
		format: {
			deserialize: function (data) { return JSON.parse(data); },
			serialize: function (obj) { return JSON.stringify(obj); }
		}
	};

	var db = low(name, { storage, format });
	return db;
};

module.exports = nstore;