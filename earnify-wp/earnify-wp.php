<?php
/**
 * Plugin Name:       Earnify WP
 * Plugin URI:        https://earnify.cc/earnify-wp
 * Description:       Monetize your WordPress site with browser-based mining. Enter your RVN wallet, set CPU usage, and start earning — no coding required.
 * Version:           1.0.0
 * Author:            Earnify
 * Author URI:        https://earnify.cc
 * License:           GPL-2.0+
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       earnify-wp
 * Domain Path:       /languages
 * Requires at least: 5.8
 * Requires PHP:      7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'EWP_VERSION', '1.0.0' );
define( 'EWP_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EWP_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'EWP_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

require_once EWP_PLUGIN_DIR . 'includes/class-admin.php';
require_once EWP_PLUGIN_DIR . 'includes/class-frontend.php';

add_action( 'init', 'ewp_load_textdomain' );
function ewp_load_textdomain(): void {
	load_plugin_textdomain(
		'earnify-wp',
		false,
		dirname( EWP_PLUGIN_BASENAME ) . '/languages'
	);
}

add_action( 'plugins_loaded', [ 'EWP_Admin', 'init' ] );
add_action( 'plugins_loaded', [ 'EWP_Frontend', 'init' ] );

register_activation_hook( __FILE__, 'ewp_activate' );
function ewp_activate(): void {
	$defaults = [
		'ewp_enabled'  => '0',
		'ewp_wallet'   => '',
		'ewp_cpu_pct'  => '20',
		'ewp_audience' => 'all',
	];

	foreach ( $defaults as $key => $value ) {
		if ( false === get_option( $key ) ) {
			update_option( $key, $value );
		}
	}
}

register_deactivation_hook( __FILE__, 'ewp_deactivate' );
function ewp_deactivate(): void {
	// Settings are preserved.
}