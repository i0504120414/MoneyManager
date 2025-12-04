#!/usr/bin/env node

/**
 * Entry point script that ensures Puppeteer is patched before any imports
 * This script should be called instead of directly calling testBankConnection.js
 */

import './puppeteerPatchEarly.js';
import '../scripts/testBankConnection.js';
