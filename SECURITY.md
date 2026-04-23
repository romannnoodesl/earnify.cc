# Security Policy

WebMiner takes the security of its software and the privacy of its users seriously. Because WebMiner operates within the browser and executes compute-intensive tasks, maintaining trust through transparent and secure code is our top priority.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| `main` branch | ✅ Yes |
| Latest Release | ✅ Yes |
| Older versions | ❌ No |

We recommend always using the latest version of the WebMiner script.

---

## Security Architecture & Guarantees

WebMiner is built with a strict security-first architecture:

- **Zero Data Collection:** WebMiner does not access, store, or transmit any personally identifiable information (PII). It uses no cookies, no `localStorage`, and no fingerprinting.
- **Sandboxed Execution:** All hashing computations are executed via WebAssembly (WASM) inside isolated Web Workers. This ensures the mining script has **zero access** to the host page's DOM, cookies, or JavaScript context.
- **No Dynamic Code Execution:** WebMiner does not use `eval()`, `new Function()`, or dynamic `<script>` injection. It is fully Content Security Policy (CSP) compliant.
- **Resource Throttling:** The library is designed to respect user hardware. It automatically caps thread usage at `navigator.hardwareConcurrency - 1` to prevent system freezes, and allows publishers to set strict CPU throttle limits (e.g., `0.2` for 20% capacity).
- **Direct Pool Connection:** Mining traffic goes directly from the user's browser to the configured mining pool via secure WebSocket (`wss://`). WebMiner does not proxy mining traffic or intercept wallet addresses.

---

## Reporting a Vulnerability

**Do NOT report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability within WebMiner, please report it responsibly. We ask that you give us a reasonable amount of time to fix the issue before public disclosure.

### How to Report

1. **Preferred Method:** Use the [GitHub Security Advisory "Report a Vulnerability" tab](../../security/advisories/new) for this repository.
2. **Alternative:** Send an email to [contactearnify@proton.me](*Replace this with your actual security email address*).

Please include the following information in your report:

- The type of vulnerability (e.g., XSS, data exfiltration, unauthorized resource consumption).
- The exact version or commit hash affected.
- Step-by-step instructions to reproduce the issue.
- Any proof-of-concept code or screenshots.
- The potential impact of the vulnerability.

### What to Expect

| Step | Timeframe |
|---|---|
| **Acknowledgment** | Within 24 hours |
| **Initial Triage** | Within 72 hours |
| **Status Update** | Within 7 days |
| **Patch / Resolution** | Depends on complexity (Critical: 1-3 days, High: 7 days, Medium/Low: Next release) |

If you do not receive a response within 72 hours, please follow up to ensure we received your original message.

---

## Out of Scope

The following issues are not considered security vulnerabilities in the context of WebMiner:

- **CPU/GPU resource usage:** By design, WebMiner uses CPU resources to mine cryptocurrency. This is its intended function. We provide throttling mechanisms (`autoMine(wallet, throttle)`) to limit this usage.
- **Ad-blocker or Antivirus detection:** Some ad-blockers or antivirus software may flag browser mining scripts as potentially unwanted programs (PUPs). This is a classification issue, not a security vulnerability in the code itself.
- **Denial of Service (DoS) against the mining pool:** We do not control the infrastructure of third-party mining pools (e.g., Zpool).
- **Vulnerabilities in outdated browsers:** We only support modern, evergreen browsers (Chrome 80+, Firefox 78+, Safari 14+, Brave).

---

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions.
2. Audit code to find any potential similar problems.
3. Prepare a fix for the `main` branch.
4. Release a patch as soon as possible, depending on severity.
5. Publicly credit the reporter (unless they prefer to remain anonymous) in the release notes and security advisory.

---

## Recognition

We appreciate the security research community. If you responsibly disclose a valid security vulnerability, we will:

- Thank you publicly in our changelog (optional).
- List you in our [Security Hall of Fame](#) *(if you choose to create one)*.

Thank you for helping keep WebMiner and the open-source community safe.
