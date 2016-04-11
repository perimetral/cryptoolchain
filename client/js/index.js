const _c = function (info) { alert(info); };
const _clone = function (src) { return JSON.parse(JSON.stringify(src)); };
const _merge = function (src, dst) { for (var i in src) dst[i] = src[i]; return dst; };

const _electron = nodeRequire('electron');
const _remote = _electron.remote;
var _ = _remote.getGlobal('_');
var _e = _._e;
var prefs = _._prefs;

var popupSet = {
	right: { position: 'right center', duration: 200 },
	top: { position: 'top center', duration: 200 }
};

$(function () {
try {

	//	api
	var apiSettings = {
		cache: false,
		defaultData: false,
		method: 'post',
		responseAsync: (options, callback) => {
			_.router(options.url).then((response) => { return callback({ data: response, success: true });
			}).catch((e) => { _e(e); return callback({ success: false }); });
		},
		successTest: (response) => { return response.success || false; },
		onResponse: (response) => { return response.data; }
	};
	_merge(apiSettings, $.fn.api.settings);
	$.fn.api.settings.api = {
		'click:menu': 'click:menu {tab}',
		'click:exit': 'click:exit',
		'click:filechoose': 'click:filechoose {reason}',
		'click:checkbox': 'click:checkbox {cbname}'
	};

	$('#appMenu .item[data-tab]').api({
		action: 'click:menu',
		onResponse: (response) => {
			var buttonPressed = response.data.buttonPressed;
			$('#appMenu .item.active').removeClass('active');
			$('#appMenu .item[data-tab=' + buttonPressed + ']').addClass('active');
		}
	});
	$('button[data-behavior=filechoose]').api({
		action: 'click:filechoose',
		onResponse: (response) => {
			var reason = response.data.reason;
			var filename = response.data.filename;
			$('.tab.active input[name=filename]').val(filename).focus();
		}
	});
	$('.exit-modal.modal .actions .button.red').api({ action: 'click:exit' });
	$('.exit-modal.modal .actions .button.green').click((ev) => { $('.exit-modal.modal').modal('hide'); });

	//	behavior
	var menuToggler = $('#appMenu .item.menu-toggler');
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
		onDeny: () => {}
	}).modal('attach events', '#appMenu .item.exit-toggler', 'show');
	$('#appMenu .item[data-tab]').tab();
	$('[data-content]').popup(popupSet.top);
	$('#appMenu .item[data-content]').popup(popupSet.right);
	$('clabel[data-content]').popup(popupSet.top);
	$('.ui.dropdown').dropdown();

	//	checkboxes
	var cbHandlers = {};
	cbHandlers.showTooltips = (action) => {
		if (action === 'off') $('[data-content]').popup('destroy');
	};
	var clabels = Array.prototype.slice.call($('clabel'));
	clabels.forEach((x, i, ar) => {
		var target = $(x).attr('data-cbname');
		$(x).api({
			action: 'click:checkbox',
			onResponse: (response) => {
				if (response.data.action && cbHandlers[target]) cbHandlers[target](response.data.action);
				var cbox = $('.cbox[name=' + target + ']');
				$(cbox).prop('checked', !($(cbox).prop('checked')));
				if (response.data.switcher) {
					var depChild = $('[data-depends=' + target + ']');
					if ($(cbox).prop('checked')) {
						$(depChild).addClass('disabled');
						$(depChild).popup('destroy');
					} else {
						$(depChild).removeClass('disabled');
						$(depChild).popup(popupSet.top);
					};
				};
			}
		});
	});

} catch (ge) { _e(ge); };
});