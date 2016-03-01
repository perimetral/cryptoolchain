var windowReference = remote.getCurrentWindow();

(function () {
try {

var targetChosen;
var htm = {};
htm.targetFilename = document.getElementById('targetFilename');

var handlers = {};
handlers.fileChosen = function (filename) {
	targetChosen = filename;
	htm.targetFilename.value = filename;
	htm.targetFilename.focus();
};
handlers.targetChoose = function (ev) {
	dialog.showSaveDialog(windowReference, {
		title: 'choose filename for new container',
		filters: [ { name: 'All files', extensions: ['*'] } ]
	}, function (filename) {
		if (!filename) return;
		fs.access(filename, fs.W_OK, function (writeError) {
			if (writeError) showErrorMessage('noFileWriteAccess');
			else handlers.fileChosen(filename);
		});
	});
};
handlers.addChain = function (ev) {
	handle({ scope: 'create', buttonId: 'addChain' });
	windowReference.setSize(640, 600);
};
handlers.chainSelected = function (ev) {
	_c(ev);
};

var entries = Array.prototype.slice.call(document.querySelectorAll('.entry'));
entries.forEach(function (x, i, ar) { x.addEventListener('click', handlers[x.getAttribute('target')]); });
var chains = Array.prototype.slice.call(document.querySelectorAll('.chain'));
chains.forEach(function (x, i, ar) { x.addEventListener('click', handlers.chainSelected); });

} catch (e) { _c(e); };
})();