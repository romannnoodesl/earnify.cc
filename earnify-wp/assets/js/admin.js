(function () {
	'use strict';

	var range = document.getElementById('ewp_cpu_pct');
	var output = document.querySelector('.ewp-range-value');
	var walletInput = document.getElementById('ewp_wallet');

	if (range && output) {
		range.addEventListener('input', function () {
			output.textContent = range.value + '%';
		});
	}

	if (walletInput) {
		walletInput.addEventListener('input', function () {
			walletInput.value = walletInput.value.replace(/\s/g, '');
		});
	}
})();
