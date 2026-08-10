// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// this enables creating a .venv file in /detox to handle the environment variables
import {config} from 'dotenv';
config({path: './detox/.env'});

const isIos = process.env.IOS === 'true';
const platformSiteOneUrl = isIos ? process.env.IOS_SITE_1_URL : process.env.ANDROID_SITE_1_URL;
const platformSiteTwoUrl = isIos ? process.env.IOS_SITE_2_URL : process.env.ANDROID_SITE_2_URL;

// CI can export these logical site names as empty strings, so `||` is deliberate: an empty
// value must fall back to the platform-specific URL rather than count as configured.
const configuredSiteOneUrl = process.env.SITE_1_URL || platformSiteOneUrl;
const configuredSiteTwoUrl = process.env.SITE_2_URL || platformSiteTwoUrl;
const configuredSiteThreeUrl = process.env.SITE_3_URL;

export const serverOneUrl = configuredSiteOneUrl || (isIos ? 'http://localhost:8065' : 'http://10.0.2.2:8065');
export const siteOneUrl = configuredSiteOneUrl || 'http://localhost:8065';
export const serverTwoUrl = configuredSiteTwoUrl || serverOneUrl;
export const siteTwoUrl = configuredSiteTwoUrl || siteOneUrl;
export const serverThreeUrl = configuredSiteThreeUrl || serverOneUrl;
export const siteThreeUrl = configuredSiteThreeUrl || siteOneUrl;
export const hasSecondServer = Boolean(configuredSiteTwoUrl) && siteTwoUrl !== siteOneUrl;
export const hasThreeDistinctServers = hasSecondServer &&
    Boolean(configuredSiteThreeUrl) &&
    siteThreeUrl !== siteOneUrl &&
    siteThreeUrl !== siteTwoUrl;
export const smtpUrl = process.env.SMTP_URL || 'http://127.0.0.1:9001';
export const adminEmail = process.env.ADMIN_EMAIL || 'sysadmin@sample.mattermost.com';
export const adminUsername = process.env.ADMIN_USERNAME || 'sysadmin';
export const adminPassword = process.env.ADMIN_PASSWORD || 'Sys@dmin-sample1';
export const ldapServer = process.env.LDAP_SERVER || '127.0.0.1';
export const ldapPort = process.env.LDAP_PORT || 389;
export const webhookBaseUrl = (() => {
    // A soft-failed sidecar writes an empty WEBHOOK_BASE_URL. Do not fall back to localhost —
    // it looks healthy locally while Mattermost cloud cannot reach the tunnel.
    if (process.env.WEBHOOK_SIDECAR_READY === 'false') {
        return '';
    }
    if (Object.prototype.hasOwnProperty.call(process.env, 'WEBHOOK_BASE_URL')) {
        return process.env.WEBHOOK_BASE_URL ?? '';
    }
    return 'http://localhost:3000';
})();

// trycloudflare tunnels pass runner health checks but Cloud callbacks stall, and loopback
// is unreachable from Cloud/Spinwick — exclude both in CI.
const isLoopbackWebhook = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(webhookBaseUrl);
const isTrycloudflareWebhook = webhookBaseUrl.includes('trycloudflare.com');

/** Sidecar URL present — enough for runner→sidecar posts (render-only mm_blocks). */
export const hasWebhookSidecar = Boolean(webhookBaseUrl);

/**
 * Mattermost Cloud can call back into the sidecar; trycloudflare and loopback CI cannot.
 */
export const hasStableWebhookIngress = Boolean(
    webhookBaseUrl &&
    !isTrycloudflareWebhook &&
    !(isLoopbackWebhook && process.env.CI === 'true') &&
    process.env.WEBHOOK_CALLBACKS_REACHABLE !== 'false',
);
