var convertMeta = (options) => {
	var meta = {};
	meta.blockSize = options.blockSize;
	meta.blocksCount = options.blocksCount;
	meta.ciphers = [];
	options.ciphers.forEach((x, i, ar) => { meta.ciphers.push(JSON.stringify(x)); });
	return new Buffer(JSON.stringify(meta));
};

class Nstore {
	constructor (options) { var s = this;
		s.name = options.name || _rs(15);
		s.path = options.path || '../db';
		s.indexPath = _.path.join(s.path, s.name);
		return s;
	}

	prepare () { var s = this;
		return new Promise((go, stop) => {
			_.fsp.access(s.path, _.fs.F_OK).then(() => {
				return _.fsp.stat(s.path);
			}).catch((e) => { if (e) return stop(e);
			}).then((result) => {
				if (!result.isDirectory()) return stop(new Error('db path is not a dir'));
				return go();
			}).catch((e) => { if (e) return stop(e);
			});
		});
	}

	create (options) { var s = this;
		return new Promise((go, stop) => {
			var password = options.password;
			var keySize = options.keySize;
			var algorithm = options.algorithm;
			var metaBuffer = convertMeta(options.meta);
			var iv = _.crypto.randomBytes(keySize / 8);
			s.prepare().then(() => { return _.cengine.hash(password, { hashSize: keySize, saltSize: keySize / 2 });
			}).catch((e) => { if (e) return stop(e);
			}).then((phash) => { return _.cengine.encrypt(metaBuffer, algorithm, phash, iv);
			}).catch((e) => { if (e) return stop(e);
			}).then((output) => {
				var metaEncrypted = output.data;
				var tag = output.tag;
				var phash = output.phash;
				var phashSize = new Buffer(phash.length.toString());
				var tagSize = new Buffer(tag.length.toString());
				var metaSize = new Buffer(metaEncrypted.length.toString());
				var ivSize = new Buffer(iv.length.toString());
				var totalSize = (phashSize.length + phash.length + tagSize.length + tag.length +
					metaSize.length + metaEncrypted.length + ivSize.length + iv.length);
				var result = Buffer.concat([phashSize, phash, tagSize, tag, metaSize, metaEncrypted,
					ivSize, iv], totalSize);
				return _.fsp.write(s.indexPath, result);
			}).catch((e) => { if (e) return stop(e);
			}).then(() => { return go();
			}).catch((e) => { if (e) return stop(e);
			});
		});
	}

	open (options) { var s = this;
		return new Promise((go, stop) => {
			var password = options.password;
			
			s.prepare().then(() => { return _.fsp.access(s.indexPath, _.fs.F_OK | _.fs.R_OK);
			}).catch((e) => { if (e) return stop(e);
			}).then(() => { return _.fsp.read(s.indexPath);
			}).catch((e) => { if (e) return stop(e);
			}).then((data) => {

			})
		});
	}
};

var nstore = (config) => { var s = this;
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

nstore.prototype.write = () => {

	const lowModel = {
		storage: {
			read: (source, parser) => {},
			write: (destination, obj, serializer) => {}
		},
		format: {
			deserialize: (data) => { return JSON.parse(data); },
			serialize: (obj) => { return JSON.stringify(obj); }
		}
	};

	var db = low(name, { storage, format });
	return db;
};

module.exports = nstore;