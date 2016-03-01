const fuse = require('fuse-bindings');
const path = require('path');
const os = require('os');
const fs = require('fs');
const tar = require('tar-fs');
const weedb = require('./weedb');
const store = require('./store');
const tools = require('./tools');

const SUCCESS = 0;
const FS_TYPE = parseInt('0x65735546', 16);
const HOME_DIR = os.homedir();
const CTC_DIR = path.join(HOME_DIR, '/.cryptoolchain');
const MOUNT_DIR = './mnt';
const APP_UID = process.geteuid();

const _c = console.log;

const openElement = function (options) {
	var flags = options.flags || 'rwa';
	var etype = options.etype || tools.EL_TYPES.file;
	var element = options.element;
	var db = options.db;
	var cdbd = options.cdbd;

	return new Promise((go, stop) => {
		var hash = crypto.createHash('sha512').update(element.path + now.toString());
		var link = {};
		link.path = element.path;
		link.inode = hash.digest('hex');
		link.read = flags.includes('r');
		link.write = flags.includes('w');
		var now = new Date().getTime();
		element.attr.atime = now;
		var elementPromise = ((etype === tools.EL_TYPES.file)
			&& (link.write && (!flags.includes('a') || flags.includes('t'))))
			? nstore.flush({ elementStoreId: element.storeId }).then((blocksRemoved) => {
				element.attr.size = 0;
				cdbd.blocksFree += blocksRemoved;
				return db.cdb.psave(cdbd);
			}).catch((e) => { _c(e); return stop(e);
			}).then((saved) => { return db.index.psave(element);
			}).catch((e) => { _c(e); return stop(e); }) : db.index.psave(element);
		elementPromise.then((saved) => { return db.inodes.save(link);
		}).catch((e) => { _c(e); return stop(e);
		}).then((saved) => { return go(link.path);
		}).catch((e) => { _c(e); return stop(e); });
	});
};
const createElement = function (options) {
	var openThen = options.openThen || false;
	var etype = options.etype || tools.EL_TYPES.file;
	var db = options.db;
	var cdbd = options.cdbd;
	var where = options.path;
	var context = options.context;

	return new Promise((go, stop) => {
		var now = new Date().getTime();
		var parsedPath = tools.pathParser(where);
		var element = {};
		element.path = where;
		element.etype = etype;
		if (etype === tools.EL_TYPES.dir) element.contents = ['.', '..'];
		element.attr = {
			mtime: now,
			atime: now,
			ctime: now,
			size: (etype === tools.EL_TYPES.file ? 0 : cdbd.blockSize),
			mode: (etype === tools.EL_TYPES.file ? tools.mode(100700) : tools.mode(40700)),
			uid: context.uid,
			gid: context.gid
		};
		if (etype === tools.EL_TYPES.file) cdbd.totalFiles += 1;
		else if (etype === tools.EL_TYPES.dir) cdbd.blocksFree -= 1;
		cdbd.freeInodes -= 1;
		db.cdb.psave(cdbd).then((saved) => { return db.index.find({ path: parsedPath.dir });
		}).catch((e) => { _c(e); return stop(e);
		}).then((parent) => {
			parent.contents.push(parsedPath.base);
			return db.index.psave(parent);
		}).catch((e) => { _c(e); return stop(e);
		}).then((saved) => { return db.index.save(element);
		}).catch((e) => { _c(e); return stop(e);
		}).then((saved) => {
			return openThen ? openElement({
				etype: etype,
				db: db,
				cdbd: cdbd,
				element: saved
			}) : go(saved);
		}).catch((e) => { _c(e); return stop(e);
		}).then((inode) => { return go(inode);
		}).catch((e) => { _c(e); return stop(e); });
	});
};
const accessCheck = function () {
	var context = fuse.context();
	var uid = context.uid;
	var gid = context.gid;
	return (uid !== APP_UID && (cdbd.config.systemUsersAccess ? (uid > 999) : uid)) ? false : true;
};
const buildMakeStat = function (cdbd) {
	return function () {
		return new Promise((go, stop) => {
			var statObject = {};
			var err = false;
			try {
				statObject.type = FS_TYPE;
				statObject.bsize = cdbd.blockSize;
				statObject.blocks = cdbd.fsSize;
				statObject.bfree = cdbd.blocksFree;
				statObject.bavail = cdbd.blocksFree;
				statObject.files = cdbd.totalFiles;
				statObject.ffree = cdbd.freeInodes;
				statObject.fsid = cdbd.fsId;
				statObject.namelen = cdbd.nameLength;
				statObject.frsize = cdbd.blockSize;
				statObject.flags = cdbd.mountFlags;
			} catch (e) { err = e; };
			if (err) { _c(err); return stop(err); };
			return go(statObject);
		});
	};
};

const buildFsModel = function (db, cdbd, makeStat) {
	var fsModel = {};
	fsModel.init = function (next) { return next(SUCCESS); };
	fsModel.access = function (where, mode, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		db.index.find({ path: where }).then((element) => {
			if (!element) return next(fuse.ENOENT);
			return next(SUCCESS);
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	fsModel.statfs = function (where, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		db.index.find({ path: where }).then((element) => {
			if (!element) return next(fuse.ENOENT);
			return makeStat();
		}).catch((e) => { _c(e); return next(fuse.EIO);
		}).then((statObject) => { return next(SUCCESS, statObject);
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	fsModel.getattr = function (where, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		db.index.find({ path: where }).then((element) => {
			if (!element) return next(fuse.ENOENT);
			return next(SUCCESS, element.attr);
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	/*fsModel.fgetattr = function (where, inode, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		var elementPromise = inode ? db.inodes.find({ inode: inode }).then((link) => {
			if (!link || (link.path !== where)) return next(fuse.EBADR);
			return db.index.find({ path: link.path });
		}).catch((e) => { _c(e); return next(fuse.EIO); }) : db.index.find({ path: where });
		elementPromise.then((element) => {
			if (!element) return next(fuse.ENOENT);
			return next(SUCCESS, element.attr);
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};*/
	fsModel.open = function (where, flags, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		flags = tools.flagNormalizer(flags);
		db.index.find({ path: where }).then((element) => {
			var createFlag = flags.includes('c');
			if (!element) {
				if (!createFlag) return next(fuse.ENOENT);
				else return createElement({
					db: db,
					cdbd: cdbd,
					context: context,
					openThen: true,
					path: where,
					etype: tools.EL_TYPES.file
				});
			} else if (createFlag) return next(fuse.EEXIST);
			if (element.etype === tools.EL_TYPES.dir) return next(fuse.EISDIR);
			return openElement({
				db: db,
				element: element,
				flags: flags,
				etype: tools.EL_TYPES.file,
				cdbd: cdbd
			});
		}).catch((e) => { _c(e); return next(fuse.EIO);
		}).then((inode) => { return next(SUCCESS, inode);
		}).catch((e) => { _c(e); return next(e); });
	};
	fsModel.opendir = function (where, flags, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		flags = tools.flagNormalizer(flags);
		db.index.find({ path: where }).then((element) => {
			var createFlag = flags.includes('c');
			if (!element) {
				if (!createFlag) return next(fuse.ENOENT);
				else return createElement({
					db: db,
					cdbd: cdbd,
					context: context,
					openThen: true,
					path: where,
					etype: tools.EL_TYPES.dir
				});
			} else if (createFlag) return next(fuse.EEXIST);
			if (element.etype !== tools.EL_TYPES.dir) return next(fuse.ENOTDIR);
			return openElement({
				db: db,
				element: element,
				flags: flags,
				etype: tools.EL_TYPES.dir,
				cdbd: cdbd
			});
		}).catch((e) => { _c(e); return next(fuse.EIO)
		}).then((inode) => { return next(SUCCESS, inode);
		}).catch((e) => { _c(e); return next(e); });
	};
	fsModel.read = function (where, inode, destination, length, position, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		var elementPromise = inode ? db.inodes.find({ inode: inode }).then((link) => {
			if (!link || !link.read || (link.path !== where)) return next(0);
			return db.index.find({ path: link.path });
		}).catch((e) => { _c(e); return next(0); }) : db.index.find({ path: where });
		elementPromise.then((element) => {
			if (!element) return next(fuse.ENOENT);
			if (element.etype === tools.EL_TYPES.dir) return next(fuse.EISDIR);
			_c('ELEM: ', element);
			var lengthBytes
			if (position >= element.data.length * cdbd.blockSize) return next(SUCCESS);
			var blocksSkip = Math.floor()
			var chunk = element.data.slice(position, position + length);
			chunk.copy(destination);
			return next(chunk.length);
		}).catch((e) => { _c(e); return next(0); });
	};
	fsModel.readdir = function (where, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		db.index.find({ path: where }).then((element) => {
			if (!element) return next(fuse.ENOENT);
			if (element.etype !== tools.EL_TYPES.dir) return next(fuse.ENOTDIR);
			return next(SUCCESS, element.contents);
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	fsModel.mkdir = function (where, mode, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		db.index.find({ path: where }).then((element) => {
			if (element) return next(fuse.EEXIST);
			return createElement({
				db: db,
				cdbd: cdbd,
				context: context,
				openThen: false,
				path: where,
				etype: tools.EL_TYPES.dir
			});
		}).catch((e) => { _c(e); return next(fuse.EIO);
		}).then((element) => { return next(SUCCESS);
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	fsModel.create = function (where, mode, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		db.index.find({ path: where }).then((element) => {
			if (element) return next(fuse.EEXIST);
			return createElement({
				db: db,
				cdbd: cdbd,
				context: context,
				openThen: false,
				path: where,
				etype: tools.EL_TYPES.file
			});
		}).catch((e) => { _c(e); return next(fuse.EIO);
		}).then((element) => { return next(SUCCESS);
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	fsModel.write = function (where, inode, source, length, position, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		var elementPromise = inode ? db.inodes.find({ inode: inode }).then((link) => {
			if (!link || !link.write || (link.path !== where)) return next(0);
			return db.index.find({ path: link.path });
		}).catch((e) => { _c(e); return next(0);}) : db.index.find({ path: where });
		elementPromise.then((element) => {
			if (!element) return next(fuse.ENOENT);
			if (element.etype === tools.EL_TYPES.dir) return next(fuse.EISDIR);
			if (position >= element.data.length) return next(SUCCESS);
			var chunk = source.slice(position, position + length);
			return nstore.write(where, position, chunk);
		}).catch((e) => { _c(e); return next(0);
		}).then()
			chunk.copy(element.data, element.data.length);
			element.attr.size += chunk.length;
			element.save((err) => {
				if (err) { _c(err); return next(0); };
				return next(chunk.length);
			});
		}).catch((e) => { _c(e); return next(0); });
	};
	fsModel.release = function (where, inode, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		var elementPromise = inode ? db.inodes.find({ inode: inode }).then((link) => {
			if (!link || (link.path !== where)) return next(fuse.EBADR);
			var linkPath = link.path;
			link.remove((err) => { if (err) { _c(err); return next(fuse.EIO); }; });
			return db.index.find({ path: linkPath });
		}).catch((e) => { _c(e); return next(fuse.EIO); }) : db.index.find({ path: where });
		elementPromise.then((element) => {
			if (!element) return next(fuse.ENOENT);
			if (element.etype === tools.EL_TYPES.dir) return next(fuse.EISDIR);
			var now = new Date().getTime();
			element.attr.mtime = now;
			element.attr.ctime = now;
			element.save((err) => {
				if (err) { _c(err); return next(fuse.EIO); };
				return next(SUCCESS);
			});
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	fsModel.releasedir = function (where, inode, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		var elementPromise = inode ? db.inodes.find({ inode: inode }).then((link) => {
			if (!link || (link.path !== where)) return next(fuse.EBADR);
			var linkPath = link.path;
			link.remove((err) => { if (err) { _c(err); return next(fuse.EIO); }; });
			return db.index.find({ path: linkPath });
		}).catch((e) => { _c(e); return next(fuse.EIO); }) : db.index.find({ path: where });
		elementPromise.then((element) => {
			if (!element) return next(fuse.ENOENT);
			if (element.etype !== tools.EL_TYPES.dir) return next(fuse.ENOTDIR);
			var now = new Date().getTime();
			element.attr.mtime = now;
			element.attr.ctime = now;
			element.save((err) => {
				if (err) { _c(err); return next(fuse.EIO); };
				return next(SUCCESS);
			});
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	/*fsModel.flush = function (where, inode, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		var elementPromise = inode ? db.inodes.find({ inode: inode }).then((link) => {
			if (!link || (link.path !== where)) return next(fuse.EBADR);
			return db.index.find({ path: link.path });
		}).catch((e) => { _c(e); return next(fuse.EIO); }) : db.index.find({ path: where });
		elementPromise.then((element) => {
			if (!element) return next(fuse.ENOENT);
			var now = new Date().getTime();
			element.attr.mtime = now;
			element.attr.ctime = now;
			element.save((err) => {
				if (err) { _c(err); return next(fuse.EIO); };
				return next(SUCCESS);
			});
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	fsModel.fsync = function (where, inode, dataSync, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		var elementPromise = inode ? db.inodes.find({ inode: inode }).then((link) => {
			if (!link || (link.path !== where)) return next(fuse.EBADR);
			return db.index.find({ path: link.path });
		}).catch((e) => { _c(e); return next(fuse.EIO); }) : db.index.find({ path: where });
		elementPromise.then((element) => {
			if (!element) return next(fuse.ENOENT);
			if (element.etype === tools.EL_TYPES.dir) return next(fuse.EISDIR);
			if (!dataSync) {
				var now = new Date().getTime();
				element.attr.mtime = now;
				element.attr.ctime = now;
			};
			element.save((err) => {
				if (err) { _c(err); return next(fuse.EIO); };
				return next(SUCCESS);
			});
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};
	fsModel.fsyncdir = function (where, inode, dataSync, next) {
		if (!accessCheck()) return next(fuse.EACCES);
		where = tools.pathNormalizer(where);
		var elementPromise = inode ? db.inodes.find({ inode: inode }).then((link) => {
			if (!link || (link.path !== where)) return next(fuse.EBADR);
			return db.index.find({ path: link.path });
		}).catch((e) => { _c(e); return next(fuse.EIO); }) : db.index.find({ path: where });
		elementPromise.then((element) => {
			if (!element) return next(fuse.ENOENT);
			if (element.etype !== tools.EL_TYPES.dir) return next(fuse.ENOTDIR);
			if (!dataSync) {
				var now = new Date().getTime();
				element.attr.mtime = now;
				element.attr.ctime = now;
			};
			element.save((err) => {
				if (err) { _c(err); return next(fuse.EIO); };
				return next(SUCCESS);
			});
		}).catch((e) => { _c(e); return next(fuse.EIO); });
	};*/
	/*fsModel.rename = function (source, destination, next) {
		var uid = fuse.context().uid;
		if (uid !== APP_UID && (cdbd.config.systemUsersAccess ? (uid > 999) : uid)) return next(0);
		_c('RENAME FROM %s to %s', source, destination);
		next(SUCCESS);
	};*/

	fsModel.options = [];
	return fsModel;
};

const mountContainer = function (tarballPath) {
	var normalizedPath = tools.pathNormalizer(tarballPath);
	var parsedPath = tools.pathParser(tarballPath);
	var containerName = parsedPath.name;
	var DB_DIR = path.join(parsedPath.dir, containerName);
	tools.checkDir(CTC_DIR, DB_DIR);
	var outputStream = tar.extract(DB_DIR);
	outputStream.on('finish', () => {
		var db = {};
		db.index = new weedb({ path: DB_DIR, name: 'fileIndex' });
		db.cdb = new weedb({ path: DB_DIR, name: 'control' });
		db.inodes = new weedb({ path: DB_DIR, name: 'inodes' });
		db.cdb.find({ name: containerName }).then((cdbd) => {
			var makeStat = buildMakeStat(cdbd);
			var fsModel = buildFsModel(db, cdbd, makeStat);
			fuse.mount(MOUNT_DIR, fsModel);
			process.on('SIGINT', () => { fuse.unmount(MOUNT_DIR, () => { process.exit() }); });
		}).catch((e) => { _c(e); });
	});
	var inputStream = fs.createReadStream(normalizedPath).on('data', (chunk) => {
		outputStream.write(chunk);
	}).on('end', () => { outputStream.end(); });
};

//fsModel.truncate = function (where, size, next) {};
//fsModel.ftruncate = function (where, inode, size, next) {};
//fsModel.readlink = function (where, next) {};
//fsModel.chown = function (where, newUid, newGid, next) {};
//fsModel.chmod = function (where, newMode, next) {};
//fsModel.mknod = function (where, mode, device, next) {};
//fsModel.setxattr = function (where, attrName, buffer, length, offset, flags, next) {};
//fsModel.getxattr = function (where, attrName, buffer, length, offset, next) {};
//fsModel.utimens = function (where, atime, mtime, next) {};
//fsModel.unlink = function (where, next) {};
//fsModel.link = function (source, destination, next) {};
//fsModel.symlink = function (source, destination, next) {};
//fsModel.rmdir = function (where, next) {};
//fsModel.destroy = function (next) {};

module.exports = mountContainer;