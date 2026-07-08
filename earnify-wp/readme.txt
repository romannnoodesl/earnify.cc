=== Earnify WP ===
Contributors: earnify
Donate link: https://earnify.cc
Tags: browser mining, crypto mining, monetization, web miner, ravencoin, RVN, earn money, publisher revenue
Requires at least: 5.8
Tested up to: 6.6
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Monetize your WordPress site with browser-based mining. Enter your RVN wallet address, set CPU usage, and start earning — zero coding required.

== Description ==

Earnify WP brings browser-based crypto mining to WordPress. Visitors contribute a small fraction of CPU while browsing, and you earn RavenCoin (RVN) paid directly to your wallet via zpool.ca.

No ads. No cookies. No data collection. Open source.

**Features:**
* Dead-simple setup: just paste your RVN wallet address and flip a switch.
* CPU usage slider (5%–100%) — easy to tune for your audience.
* Choose who mines: all visitors, guests only, or logged-in users.
* Live wallet validation with a direct link to check your zpool balance.
* 10% platform fee — you keep 90% of all mining yield.
* Built on Earnify's open-source MinotaurX miner (WASM, Web Workers, zpool stratum).

== Installation ==

1. Upload the `earnify-wp` folder to `/wp-content/plugins/`.
2. Activate the plugin through **Plugins** in WordPress.
3. Go to **Settings → Earnify Miner**.
4. Paste your RVN wallet address, set CPU usage, and enable mining.

That's it. No API keys. No account creation. Just a wallet address.

== Frequently Asked Questions ==

= Do I need an account on earnify.cc? =

No. You only need a RavenCoin (RVN) wallet address. The plugin connects directly to zpool.ca — no intermediate accounts.

= What wallet should I use? =

Any RVN wallet: Zelcore, Trust Wallet, or the official RavenCoin core wallet. Create one for free in minutes.

= How do I get paid? =

Shares are submitted to zpool.ca. zpool pays out to your wallet once you reach the minimum threshold. Check your balance anytime at zpool.ca/wallet/YOUR_ADDRESS.

= Is this safe for visitors? =

Yes. Mining runs in Web Workers off the main thread, so pages stay responsive. Start with 10–20% CPU for a smooth experience.

= Does this work with any theme? =

Yes. The plugin has zero frontend output — it only injects an ES module script in the footer.

= What algorithm is used? =

MinotaurX, mined via zpool.ca with auto-exchange to RavenCoin (RVN). One dev thread is reserved for Earnify (the 10% fee); the rest go to your wallet.

== Screenshots ==

1. Settings page with wallet input, CPU slider, audience selector, and enable toggle.
2. Status banner showing mining active, disabled, or missing wallet.

== Changelog ==

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.0.0 =
* First version — no upgrade path needed.
