const _c = function (info) { alert(info); };
const _clone = function (src) { return JSON.parse(JSON.stringify(src)); };
const _merge = function (src, dst) { for (var i in src) dst[i] = src[i]; return dst; };
//const _tell = function (type, data) { ipc.send('type', { data: data || {}, windowId: _windowId }); };

const _electron = nodeRequire('electron');
const _remote = _electron.remote;
const _dialog = _remote.dialog;
var _ = _remote.getGlobal('_');
var router = _.router;
var _e = _._e;

$(function () {
try {

var menuButtons = $('#appMenu .item[data-tab]');
var menuToggler = $('#appMenu .item.menu-toggler');
var exitToggler = $('#appMenu .item.exit-toggler');

var apiSettings = {
	cache: false,
	defaultData: false,
	method: 'post',
	responseAsync: function (options, callback) {
		router(options.url).then((response) => { return callback({ data: response, success: true });
		}).catch((e) => { _e(e); return callback({ success: false }); });
	},
	successTest: function (response) { return response.success || false; },
	onResponse: function (response) { return response.data; }
};
_merge(apiSettings, $.fn.api.settings);
$.fn.api.settings.api = {
	'click:menu': 'click:menu {tab}',
	'click:exit': 'click:exit'
};

$('#appMenu .item[data-tab]').api({
	action: 'click:menu',
	onResponse: function (response) {
		var buttonPressed = response.data.buttonPressed;
		$('#appMenu .item.active').removeClass('active');
		$('#appMenu .item[data-tab=' + buttonPressed + ']').addClass('active');
	}
});
$('.exit-modal.modal .actions .button.red').api({ action: 'click:exit' });
$('.exit-modal.modal .actions .button.green').click((ev) => {
	$('.exit-modal.modal').modal('hide');
});
menuToggler.click((ev) => {
	if (menuToggler.hasClass('menu-opened')) {
		$('#appMenu').animate({ left: '-162px' }, 100, 'linear', () => { menuToggler.removeClass('menu-opened'); });
		$('.app-content').animate({ 'margin-left': '48px' }, 100, 'linear');
	} else {
		$('#appMenu').animate({ left: '0px' }, 100, 'linear', () => { menuToggler.addClass('menu-opened'); });
		$('.app-content').animate({ 'margin-left': '210px' }, 100, 'linear');
	};
});
$('.exit-modal.modal').modal({
	closable: false,
	onDeny: function () {  }
}).modal('attach events', '#appMenu .item.exit-toggler', 'show');
menuButtons.tab();
menuButtons.popup({ position: 'right center', duration: 100 });

/*.state({

})*/


} catch (e) { /*_tell({  e.stack);*/ _c(e.stack); };
});