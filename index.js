const _c = (info) => { console.log(info); };
const _e = (e) => { _c('ERROR: ' + (e.message || 'NO EMSG') + (e.stack || 'NO ESTACK')); };

try {

global._ = {};
global._c = _c;
global._e = _._e = _e;
global._t = require('./lib/tools');
global._clone =  (src) => { return JSON.parse(JSON.stringify(src)); };
global._cfg = require('./configuration');
global._rs = (length) => { return (Math.random() * 10 * length).toString(); };
global._dummy = (x) => { return x; };

_.electron = require('electron');
_.app = _.electron.app;
_.BrowserWindow = _.electron.BrowserWindow;
_.dialog = _.electron.dialog;
_.path = require('path');
_.fs = require('fs');
_.os = require('os');
_.crypto = require('crypto');
_.stream = require('stream');
global._rb = (size) => {
	return new Promise((go, stop) => {
		_.crypto.randomBytes(size, (e, result) => { if (e) return stop(e); return go(result); });
	});
};

_.fsp = require('./lib/fsp');
_.cengine = require('./lib/cengine');
_.weedb = require('./lib/weedb');
_.timerc = require('./lib/timerscope');
_.router = require('./lib/router');

const ipc = _.electron.ipcMain;

const makeWindowOptions = (options) => {
	options = options || {};
	options.width = options.width || _cfg.index.width;
	options.height = options.height || _cfg.index.height;
	options.title = options.title || _cfg.index.title + _cfg.index.titleDivider + _cfg.index.activeTab;
	options.darkTheme = true;
	options.icon = options.icon || _cfg.index.icon;
	options.webPreferences = options.webPreferences || { webaudio: false, defaultEncoding: 'UTF-8', images: false };
	options.frame = 'frame' in options ? options.frame : true;
	options.show = false;
	options.backgroundColor = options.backgroundColor || _cfg.index.backgroundColor;
	options.transparent = options.transparent || false;
	return options;
};

const viewsDir = _.path.join(__dirname, 'client/views');
const windowOptions = {};
windowOptions.index = makeWindowOptions();

const createWindow = (href, options) => {
	var newWindow = new _.BrowserWindow(options);
	newWindow.setMenu(null);
	newWindow.loadURL('file://' + _.path.join(viewsDir, href + '.htm'));
	newWindow.on('closed', () => { newWindow = null; });
	newWindow.webContents.on('did-finish-load', function () { newWindow.show(); });
	return newWindow;
};

const mainWindowCreator = () => { _.mainWindow = createWindow('index', windowOptions.index); return _.mainWindow; };
_.app.once('ready', mainWindowCreator);
_.app.on('before-quit', (ev) => { ipc.send('ping', 'exitTry'); });
_.app.once('window-all-closed', () => { _.app.quit(); });

} catch (ge) { _e(ge); };