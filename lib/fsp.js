const callsTwo = 'access writeFile';

const convertCall = function (method) {
	if (callsTwo.includes(method)) return function (what1, what2) {
		return new Promise(function (go, stop) {
			_.fs[method](what1, what2, function (e) { if (e) return stop(e); go(); });
		});
	}; else return function (what) {
		return new Promise(function (go, stop) {
			_.fs[method](what, function (e, result) { if (e) return stop(e); go(result); });
		});
	};
};

var Fsp = function () { var s = this;
	if (!(s instanceof Fsp)) return new Fsp();

	s.stat = convertCall('stat');
	s.access = convertCall('access');
	s.write = convertCall('writeFile');
	s.read = convertCall('readFile');

	return s;
};

module.exports = Fsp;