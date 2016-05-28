var defaultOptions = {};
defaultOptions.hashSize = 32;
defaultOptions.saltSize = 16;
defaultOptions.iterations = 272727;

var hasher = (password, salt, iterations, hashSize) => {
	return new Promise((go, stop) => {
		_.crypto.pbkdf2(password, salt, iterations, hashSize, (e, hash) => { if (e) return stop(e);
			return go({ hash, salt });
		});
	});
};

var cengine = {};
cengine.hash = (password, options) => {
	return new Promise((go, stop) => {
		var hashSize = options.hashSize || defaultOptions.hashSize;
		var saltSize = options.saltSize || defaultOptions.saltSize;
		var iterations = options.iterations || defaultOptions.iterations;
		_rb(saltSize).then((salt) => { return hasher(password, salt, iterations, hashSize);
		}).catch((e) => { return stop(e);
		}).then((data) => {
			var combine = new Buffer(data.hash.length + data.salt.length + 8);
			combine.writeUInt32BE(data.salt.length, 0, true);
			combine.writeUInt32BE(iterations, 4, true);
			data.salt.copy(combine, 8);
			data.hash.copy(combine, data.salt.length + 8);
			return go(combine);
		}).catch((e) => { return stop(e);
	});
};
cengine.verify = (password, combine) => {
	return new Promise((go, stop) => {
		var saltSize = combine.readUInt32BE(0);
		var hashSize = combine.length - saltSize - 8;
		var iterations = combine.readUInt32BE(4);
		var salt = combine.slice(8, saltSize + 8);
		var hash = combine.toString('binary', saltSize + 8);
		hasher(password, salt, iterations, hashSize).then((data) => {
			return go(data.hash.toString('binary') === hash);
		}).catch((e) => { return stop(e);
		});
	});
};
cengine.encrypt = (input, algorithm, phash, iv) => {
	return new Promise((go, stop) => {
		try {
			var cipher = _.crypto.createCipheriv(algorithm, phash, iv);
			var encrypted = cipher.update(input);
			encrypted += cipher.final();
			return go({ data: encrypted, tag: cipher.getAuthTag(), phash: phash });
		} catch (e) { return stop(e); };
	});
};
cengine.decrypt = (input, algorithm, phash, iv) => {
	return new Promise((go, stop) => {
		try {
			var decipher = _.crypto.createDecipheriv(algorithm, phash, iv)
			decipher.setAuthTag(input.tag);
			var output = decipher.update(input.data);
			output += decipher.final();
			return go(output);
		} catch (e) { return stop(e); };
	});
};

module.exports = cengine;