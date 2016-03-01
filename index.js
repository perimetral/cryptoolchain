const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const weedb = require('./lib/weedb');
const timerc = require('./lib/timerscope');

const _c = function (info) { console.log(info); };
const _clone =  function (src) { return JSON.parse(JSON.stringify(src)); };
const _e = function (errorCode) { _c(errors.errorCode || errors.undefinedError); };

try {

var routes = {};
routes.click = {};
routes.click.main = function (data) { return new Promise((go, stop) => { go('all ok'); }); };
routes.click.menu = function (data) {
	return new Promise((go, stop) => {
		var buttonPressed = data[0];
		if (buttonPressed === 'exit') return go(app.exit(0));
		return go({ buttonPressed: data[0] })
	});
};
routes.click.exit = function (data) { return new Promise((go, stop) => { go(app.exit(0)); }); };

global._ = {};
var errors = _.errors = require('./errors');
_._e = _e;
var router = _.router = function (query) {
	return new Promise((go, stop) => {
		try {
			query = query.split(' ');
			var metadata = query[0].split(':');
			var action = metadata[0];
			var scope = (metadata.length > 1) ? metadata[1] : 'main';
			var data = (query.length > 1) ? query.slice(1, query.length) : [];
		} catch (err) { _c(err.stack); return stop(err); };
		if (!routes[action] || !routes[action][scope]) { _c('no action'); return stop(errors.invalidAction); };
		routes[action][scope](data).then((result) => { return go(result);
		}).catch((e) => { _c(e); return stop(e); });
	});
};

const makeWindowOptions = function (options) {
	options = options || {};
	options.width = options.width || 800;
	options.height = options.height || 600;
	options.title = options.title || 'cryptoolchain';
	options.darkTheme = true;
	options.icon = options.icon || 'appicon.png';
	options.webPreferences = options.webPreferences || { webaudio: false, defaultEncoding: 'UTF-8', images: false };
	options.frame = 'frame' in options ? options.frame : true;
	options.show = false;
	options.backgroundColor = options.backgroundColor || '#222';
	options.transparent = options.transparent || false;
	return options;
};

const viewsDir = path.join(__dirname, 'client/views');
var windowOptions = {};
windowOptions.index = makeWindowOptions();

const createWindow = function (href, options) {
	var newWindow = new BrowserWindow(options);
	newWindow.setMenu(null);
	newWindow.loadURL('file://' + path.join(viewsDir, href + '.htm'));
	newWindow.on('closed', () => { newWindow = null; });
	newWindow.webContents.on('did-finish-load', function () { newWindow.show(); });
	return newWindow;
};

const mainWindowCreator = () => { return createWindow('index', windowOptions.index); };
app.once('ready', mainWindowCreator);
app.once('window-all-closed', function () { app.quit(); });
app.once('activate', mainWindowCreator);

} catch (e) { _c(e); };