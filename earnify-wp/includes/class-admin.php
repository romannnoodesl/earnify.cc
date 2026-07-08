<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class EWP_Admin {

	private static string $option_group = 'ewp_settings_group';
	private static string $page_slug    = 'earnify-wp';

	public static function init(): void {
		add_action( 'admin_menu', [ __CLASS__, 'add_settings_page' ] );
		add_action( 'admin_init', [ __CLASS__, 'register_settings' ] );
		add_action( 'admin_enqueue_scripts', [ __CLASS__, 'enqueue_assets' ] );
		add_filter( 'plugin_action_links_' . EWP_PLUGIN_BASENAME, [ __CLASS__, 'add_action_links' ] );
	}

	public static function enqueue_assets( string $hook_suffix ): void {
		if ( 'settings_page_' . self::$page_slug !== $hook_suffix ) {
			return;
		}
		wp_enqueue_style(
			'ewp-admin',
			EWP_PLUGIN_URL . 'assets/css/admin.css',
			[],
			EWP_VERSION
		);
		wp_enqueue_script(
			'ewp-admin',
			EWP_PLUGIN_URL . 'assets/js/admin.js',
			[],
			EWP_VERSION,
			true
		);
	}

	public static function add_action_links( array $links ): array {
		$settings_link = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'options-general.php?page=' . self::$page_slug ) ),
			esc_html__( 'Settings', 'earnify-wp' )
		);
		array_unshift( $links, $settings_link );
		return $links;
	}

	public static function add_settings_page(): void {
		add_options_page(
			__( 'Earnify WP', 'earnify-wp' ),
			__( 'Earnify Miner', 'earnify-wp' ),
			'manage_options',
			self::$page_slug,
			[ __CLASS__, 'render_page' ]
		);
	}

	public static function register_settings(): void {
		register_setting( self::$option_group, 'ewp_enabled', [ 'sanitize_callback' => [ __CLASS__, 'sanitize_checkbox' ] ] );
		register_setting( self::$option_group, 'ewp_wallet', [ 'sanitize_callback' => [ __CLASS__, 'sanitize_wallet' ] ] );
		register_setting( self::$option_group, 'ewp_cpu_pct', [ 'sanitize_callback' => [ __CLASS__, 'sanitize_cpu_pct' ] ] );
		register_setting( self::$option_group, 'ewp_audience', [ 'sanitize_callback' => [ __CLASS__, 'sanitize_audience' ] ] );

		add_settings_section(
			'ewp_main_section',
			'',
			'__return_empty_string',
			self::$page_slug
		);

		self::add_field( 'ewp_wallet', __( 'RVN Wallet Address', 'earnify-wp' ), 'render_wallet' );
		self::add_field( 'ewp_cpu_pct', __( 'CPU Usage', 'earnify-wp' ), 'render_cpu' );
		self::add_field( 'ewp_audience', __( 'Mine For', 'earnify-wp' ), 'render_audience' );
		self::add_field( 'ewp_enabled', __( 'Enable Mining', 'earnify-wp' ), 'render_enabled' );
	}

	private static function add_field( string $name, string $title, string $render_method ): void {
		add_settings_field(
			$name,
			$title,
			[ __CLASS__, $render_method ],
			self::$page_slug,
			'ewp_main_section',
			[ 'name' => $name, 'label_for' => $name ]
		);
	}

	// ── Sanitizers ──────────────────────────────────────────────

	public static function sanitize_checkbox( $value ): string {
		return $value === '1' ? '1' : '0';
	}

	public static function sanitize_wallet( string $value ): string {
		$value = trim( $value );
		if ( ! empty( $value ) && ! preg_match( '/^R[a-km-zA-HJ-NP-Z1-9]{25,34}$/', $value ) ) {
			add_settings_error(
				'ewp_wallet',
				'ewp_invalid_wallet',
				__( 'Wallet address does not look like a valid RVN address. It should start with "R" and be 26–35 characters.', 'earnify-wp' ),
				'warning'
			);
		}
		return $value;
	}

	public static function sanitize_cpu_pct( string $value ): string {
		$pct = absint( $value );
		if ( $pct < 5 ) {
			$pct = 5;
		}
		if ( $pct > 100 ) {
			$pct = 100;
		}
		return (string) $pct;
	}

	public static function sanitize_audience( string $value ): string {
		return in_array( $value, [ 'all', 'logged_in', 'logged_out' ], true ) ? $value : 'all';
	}

	// ── Renderers ───────────────────────────────────────────────

	public static function render_wallet( array $args ): void {
		$value  = get_option( $args['name'], '' );
		$name   = esc_attr( $args['name'] );
		printf(
			'<input type="text" name="%s" id="%s" value="%s" class="regular-text ewp-wallet-input" placeholder="R..." maxlength="40" spellcheck="false" autocomplete="off" style="font-family:monospace;" />',
			esc_attr( $name ),
			esc_attr( $name ),
			esc_attr( $value )
		);

		if ( ! empty( $value ) && preg_match( '/^R[a-km-zA-HJ-NP-Z1-9]{25,34}$/', $value ) ) {
			$wallet_url = 'https://zpool.ca/wallet/' . rawurlencode( $value );
			printf(
				' <a href="%s" target="_blank" rel="noopener noreferrer" class="ewp-wallet-link">%s</a>',
				esc_url( $wallet_url ),
				esc_html__( 'Check balance on zpool →', 'earnify-wp' )
			);
		}

		echo '<p class="description">';
		esc_html_e( 'Enter your RavenCoin (RVN) wallet address. Create one for free using Zelcore, Trust Wallet, or the official RavenCoin core wallet. Shares are submitted to zpool.ca — payouts go directly to this address.', 'earnify-wp' );
		echo '</p>';
	}

	public static function render_cpu( array $args ): void {
		$value  = get_option( $args['name'], '20' );
		$name   = esc_attr( $args['name'] );
		printf(
			'<input type="range" name="%s" id="%s" value="%s" min="5" max="100" step="5" class="ewp-range" />',
			esc_attr( $name ),
			esc_attr( $name ),
			esc_attr( $value )
		);
		printf(
			' <output for="%s" class="ewp-range-value">%s%%</output>',
			esc_attr( $name ),
			esc_html( $value )
		);
		echo '<p class="description">';
		esc_html_e( 'How much of each visitor\'s CPU to use. Lower values are safer and less noticeable. Recommended: 10–30%.', 'earnify-wp' );
		echo '</p>';
	}

	public static function render_audience( array $args ): void {
		$value  = get_option( $args['name'], 'all' );
		$name   = esc_attr( $args['name'] );
		$options = [
			'all'        => __( 'All visitors', 'earnify-wp' ),
			'logged_out' => __( 'Guests only (not logged-in users)', 'earnify-wp' ),
			'logged_in'  => __( 'Logged-in users only', 'earnify-wp' ),
		];
		echo '<select name="' . esc_attr( $name ) . '" id="' . esc_attr( $name ) . '">';
		foreach ( $options as $key => $label ) {
			printf(
				'<option value="%s" %s>%s</option>',
				esc_attr( $key ),
				selected( $value, $key, false ),
				esc_html( $label )
			);
		}
		echo '</select>';
	}

	public static function render_enabled( array $args ): void {
		$value  = get_option( $args['name'], '0' );
		$name   = esc_attr( $args['name'] );
		printf(
			'<label class="ewp-toggle"><input type="checkbox" name="%s" id="%s" value="1" %s /><span class="ewp-toggle-slider"></span></label>',
			esc_attr( $name ),
			esc_attr( $name ),
			checked( '1', $value, false )
		);

		$wallet = get_option( 'ewp_wallet', '' );
		if ( empty( $wallet ) && '1' === $value ) {
			echo '<p class="description" style="color:#d63638;">';
			esc_html_e( 'You must enter a wallet address above before mining can start.', 'earnify-wp' );
			echo '</p>';
		}
	}

	// ── Page ────────────────────────────────────────────────────

	public static function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'earnify-wp' ) );
		}

		$wallet  = get_option( 'ewp_wallet', '' );
		$enabled = get_option( 'ewp_enabled', '0' );
		?>
		<div class="wrap ewp-wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

			<?php if ( '1' === $enabled && ! empty( $wallet ) ) : ?>
				<div class="ewp-status ewp-status--active">
					<strong><?php esc_html_e( 'Mining is active.', 'earnify-wp' ); ?></strong>
					<?php esc_html_e( 'Visitors on your site are now contributing compute. Payouts go to your wallet via zpool.ca.', 'earnify-wp' ); ?>
				</div>
			<?php elseif ( '1' === $enabled && empty( $wallet ) ) : ?>
				<div class="ewp-status ewp-status--warning">
					<strong><?php esc_html_e( 'Wallet address required.', 'earnify-wp' ); ?></strong>
					<?php esc_html_e( 'Mining is enabled but no wallet address is set. Enter your RVN address below.', 'earnify-wp' ); ?>
				</div>
			<?php else : ?>
				<div class="ewp-status ewp-status--inactive">
					<strong><?php esc_html_e( 'Mining is disabled.', 'earnify-wp' ); ?></strong>
					<?php esc_html_e( 'Enter your wallet address and enable mining to start earning from your traffic.', 'earnify-wp' ); ?>
				</div>
			<?php endif; ?>

			<form method="post" action="options.php">
				<?php
				settings_fields( self::$option_group );
				do_settings_sections( self::$page_slug );
				submit_button();
				?>
			</form>

			<div class="ewp-card">
				<h2><?php esc_html_e( 'How it works', 'earnify-wp' ); ?></h2>
				<ol>
					<li><?php esc_html_e( 'Enter your RavenCoin wallet address above.', 'earnify-wp' ); ?></li>
					<li><?php esc_html_e( 'Choose how much CPU to use (lower = less noticeable).', 'earnify-wp' ); ?></li>
					<li><?php esc_html_e( 'Click Save Changes, then enable mining.', 'earnify-wp' ); ?></li>
					<li><?php esc_html_e( 'Visitors mine MinotaurX via zpool.ca — payouts go to your RVN wallet.', 'earnify-wp' ); ?></li>
				</ol>
				<p>
					<?php esc_html_e( 'Earnify takes a 10% fee. You keep 90% of the mining yield. Open source, no tracking, no ads.', 'earnify-wp' ); ?>
					<a href="https://earnify.cc" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Learn more →', 'earnify-wp' ); ?></a>
				</p>
			</div>
		</div>
		<?php
	}
}