const path = require('path');
const os = require('os');
const fs = require('fs');
const tar = require('tar-fs');
const weedb = require('./weedb');
const tools = require('./tools');

const _c = console.log;
const HOME_DIR = os.homedir();
const CTC_DIR = path.join(HOME_DIR, '/.cryptoolchain');

const createContainer = function (options) {
	options = options || {};
	options.name = options.name || (Math.random() * 100000).toString();
	options.fsId = options.fsId || 272727;
	options.blockSize = options.blockSize || 4096;
	options.fsSize = options.fsSize || 25600;
	options.nameLength = options.nameLength || 1024;
	options.mountFlags = options.mountFlags || 0;

	var config = options.config || {};
	config.systemUsersAccess = 'systemUsersAccess' in config ? config.systemUsersAccess : true;

	var DB_DIR = path.join(CTC_DIR, options.name);

	tools.checkDir(HOME_DIR, CTC_DIR);
	tools.checkDir(CTC_DIR, DB_DIR);
	var db = {};
	db.index = new weedb({ path: DB_DIR, name: 'fileIndex' });
	db.cdb = new weedb({ path: DB_DIR, name: 'control' });
	db.inodes = new weedb({ path: DB_DIR, name: 'inodes' });

	db.cdb.save({
		name: options.name,
		fsId: options.fsId,
		blockSize: options.blockSize,
		fsSize: options.fsSize,
		nameLength: options.nameLength,
		mountFlags: options.mountFlags,
		blocksFree: options.fsSize,
		totalFiles: 0,
		freeInodes: options.fsSize,
		config: config
	}).then((saved) => {
		var now = new Date().getTime();
		var sizeInMbytes = (options.fsSize * options.blockSize) / (1024 * 1024);
		return db.index.save({
			path: '/',
			etype: tools.EL_TYPES.dir,
			contents: ['.', '..'],
			attr: {
				mtime: now,
				atime: now,
				ctime: now,
				size: sizeInMbytes * 1024 * 1024,
				mode: tools.mode(40700),
				uid: process.getuid(),
				gid: process.getgid()
			}
		});
	}).catch((e) => { _c(e);
	}).then((saved) => {
		var outputStream = fs.createWriteStream(path.join(CTC_DIR, options.name + '.ball'), { mode: 0700 });
		outputStream.on('finish', () => { tools.removeDir(DB_DIR); _c('tarball saved'); });
		var pack = tar.pack(DB_DIR).on('data', (chunk) => {
			outputStream.write(chunk);
		}).on('end', () => { outputStream.end(); });
	}).catch((e) => { _c(e); });
};

module.exports = createContainer;