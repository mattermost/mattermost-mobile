// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {getLocalIPAddress} = require('./helpers');

const baseUrl = `http://${getLocalIPAddress()}:8065`;

export const serverOneUrl = process.env.SITE_1_URL || process.env.SITE_URL || baseUrl;
export const siteOneUrl = process.env.SITE_1_URL || process.env.SITE_URL || baseUrl;
export const serverTwoUrl = process.env.SITE_2_URL || baseUrl;
export const siteTwoUrl = process.env.SITE_2_URL || baseUrl;
export const serverThreeUrl = process.env.SITE_3_URL || baseUrl;
export const siteThreeUrl = process.env.SITE_3_URL || baseUrl;
export const smtpUrl = process.env.SMTP_URL || `http://${getLocalIPAddress()}:9001`;
export const adminEmail = process.env.ADMIN_EMAIL || 'sysadmin@sample.mattermost.com';
export const adminUsername = process.env.ADMIN_USERNAME || 'sysadmin';
export const adminPassword = process.env.ADMIN_PASSWORD || 'Sys@dmin-sample1';
export const ldapServer = process.env.LDAP_SERVER || getLocalIPAddress();
export const ldapPort = process.env.LDAP_PORT || 389;
