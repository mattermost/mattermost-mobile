// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Shared URL resolution for Detox globalSetup and test_config.
// - siteOneUrl: host-side Jest/API calls → localhost
// - serverOneUrl: iOS simulator app connect → machine LAN IP (WebSockets)
// Override with SERVER_1_URL or DETOX_LAN_IP in detox/.env when auto-detect is wrong.

const {execSync} = require('child_process');
const os = require('os');
const path = require('path');

require('dotenv').config({path: path.join(__dirname, '../../.env')});

function getIpv4FromInterface(name) {
    const entries = os.networkInterfaces()[name];
    if (!entries) {
        return null;
    }

    for (const entry of entries) {
        if ((entry.family === 'IPv4' || entry.family === 4) && !entry.internal) {
            return entry.address;
        }
    }

    return null;
}

function getDefaultRouteInterface() {
    if (process.platform !== 'darwin') {
        return null;
    }

    try {
        const output = execSync('route -n get default', {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']});
        const match = output.match(/interface:\s+(\S+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function getEn0Ipv4() {
    if (process.platform !== 'darwin') {
        return null;
    }

    try {
        const address = execSync('ipconfig getifaddr en0', {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']}).trim();
        return address || null;
    } catch {
        return null;
    }
}

function getLocalLanIpv4() {
    if (process.env.DETOX_LAN_IP) {
        return process.env.DETOX_LAN_IP;
    }

    try {
        const candidates = [
            getEn0Ipv4(),
            getIpv4FromInterface(getDefaultRouteInterface()),
            getIpv4FromInterface('en0'),
            getIpv4FromInterface('en1'),
            getIpv4FromInterface('eth0'),
        ].filter(Boolean);

        const seen = new Set();
        for (const address of candidates) {
            if (!seen.has(address)) {
                seen.add(address);
                return address;
            }
        }

        for (const entries of Object.values(os.networkInterfaces())) {
            if (!entries) {
                continue;
            }
            for (const entry of entries) {
                if ((entry.family === 'IPv4' || entry.family === 4) && !entry.internal) {
                    return entry.address;
                }
            }
        }
    } catch {
        // Sandboxed environments may block network interface queries.
    }

    return '127.0.0.1';
}

const localApiUrl = 'http://localhost:8065';
const localLanUrl = `http://${getLocalLanIpv4()}:8065`;

const siteOneUrl = process.env.SITE_1_API_URL || process.env.SITE_1_URL || localApiUrl;

const serverOneUrl = process.env.SERVER_1_URL ||
    process.env.SITE_1_URL ||
    (process.env.IOS === 'true' ? localLanUrl : 'http://10.0.2.2:8065');

module.exports = {
    getLocalLanIpv4,
    localApiUrl,
    localLanUrl,
    siteOneUrl,
    serverOneUrl,
};
