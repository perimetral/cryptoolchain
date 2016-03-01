const path = require('path');
const fs = require('fs');
const constants = require('constants');

const _c = console.log;

var tools = {};
tools.checkDir = function (parent, target) {
	try { fs.accessSync(parent, fs.W_OK);
	} catch (e) { _c(e); return false; };
	try { fs.accessSync(target, fs.F_OK);
	} catch (e) {
		try { fs.mkdirSync(target, 0700); return true;
		} catch (e2) { _c(e2); return false; };
	};
};
const removeDir = function (target) {
	var dirContents = fs.readdirSync(target);
	dirContents.forEach((x, i, ar) => {
		try {
			var fullXPath = path.join(target, x);
			var xStats = fs.lstatSync(fullXPath);
			if (xStats.isDirectory()) return removeDir(fullXPath);
			else return fs.unlinkSync(fullXPath);
		} catch (e) { _c(e); return undefined; };
	});
	return fs.rmdirSync(target);
};
tools.removeDir = removeDir;
tools.mode = function (x) { return parseInt(x, 8); };
tools.flagNormalizer = function (x) {
	if (x === constants.O_RDONLY) return 'r';
	else if (x === constants.O_WRONLY) return 'w';
	else if (x === (constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC)) return 'wct';
	else if (x === (constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND)) return 'wca';
	else if (x === constants.O_RDWR) return 'rw';
	else if (x === (constants.O_RDWR | constants.O_CREAT | constants.O_TRUNC)) return 'rwct';
	else if (x === (constants.O_RDWR | constants.O_CREAT | constants.O_APPEND)) return 'rwca';
	else return 'rwa';
};
tools.pathNormalizer = function (where) { return path.resolve(path.normalize(where)); };
tools.pathParser = function (where) { return path.parse(tools.pathNormalizer(where)); };

tools.EL_TYPES = {};
tools.EL_TYPES.file = 1;
tools.EL_TYPES.dir = 4;

module.exports = tools;