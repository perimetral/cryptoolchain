try {

const routes = {};
routes.click = {};
routes.click.main = (data) => { return new Promise((go, stop) => { return go({}); }); };
routes.click.menu = (data) => {
	return new Promise((go, stop) => {
		var buttonPressed = data[0];
		_.mainWindow.setTitle(_cfg.index.title + _cfg.index.titleDivider + buttonPressed);
		return go({ buttonPressed });
	});
};
routes.click.exit = (data) => { return new Promise((go, stop) => { return go({ exitCode: _.app.exit(0) }); }); };
routes.click.filechoose = (data) => {
	var reason = data[0];
	var filters = [ { name: 'All files', extensions: ['*'] } ];
	if (reason === 'create') return new Promise((go, stop) => {
		_.dialog.showSaveDialog({ title: 'choose filename for new container', filters }, (filename) => {
			if (!filename) return go({ filename: '', reason });
			_.fs.access(filename, _.fs.W_OK, (e) => {
				if (e && e.code !== 'ENOENT') return stop(e);
				return go({ filename, reason });
			});
		});
	}); else if (reason === 'calibrate' || reason === 'mount') return new Promise((go, stop) => {
		_.dialog.showSaveDialog({ title: 'choose container for opening', filters }, (filename) => {
			if (!filename) return go({ filename: '', reason });
			_.fs.access(filename, _.fs.W_OK, (e) => {
				if (e) return stop(e);
				return go({ filename, reason });
			});
		});
	});
};

var cbHandlers = {};
cbHandlers.showTooltips = (result) => {
	return new Promise((go, stop) => {
		result.action = 'off';
		return go(result);
	});
};
var cbSwitchers = 'otfCompress autoRaiseSize accessLogsInContainer';
//	tabSwitchChangesTitle showTooltips exitConfirmation hideMenuOnInit
routes.click.checkbox = (data) => {
	return new Promise((go, stop) => {
		var cbname = data[0];
		var result = { switcher: false };
		if (cbSwitchers.includes[cbname]) result.switcher = true;
		if (cbHandlers[cbname])
			cbHandlers[cbname](result).then((handled) => { return go(handled);
			}).catch((e) => { _e(e); return stop(e); });
		else return go(result);
	});
};

const router = (query) => {
	return new Promise((go, stop) => {
		try {
			query = query.split(' ');
			var metadata = query[0].split(':');
			var action = metadata[0];
			var scope = (metadata.length > 1) ? metadata[1] : 'main';
			var data = (query.length > 1) ? query.slice(1, query.length) : [];
		} catch (e) { _e(e); return stop(e); };

		if (!routes[action] || !routes[action][scope]) {
			var e = new Error('no such action: ' + action + ':' + scope);
			_e(e); return stop(e);
		};
		routes[action][scope](data).then((result) => { return go(result);
		}).catch((e) => { _e(e); return stop(e); });
	});
};

module.exports = router;
} catch (ge) { _e(ge); };