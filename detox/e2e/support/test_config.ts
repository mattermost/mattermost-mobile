// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const serverOneUrl = process.env.SITE_1_URL || (process.env.IOS === 'true' ? 'http://localhost:8065' : 'http://10.0.2.2:8065');
export const siteOneUrl = process.env.SITE_1_URL || 'http://localhost:8065';
export const serverTwoUrl = process.env.SITE_2_URL || 'http://localhost:8065';
export const siteTwoUrl = process.env.SITE_2_URL || 'http://localhost:8065';
export const serverThreeUrl = process.env.SITE_3_URL || 'http://localhost:8065';
export const siteThreeUrl = process.env.SITE_3_URL || 'http://localhost:8065';
export const smtpUrl = process.env.SMTP_URL || 'http://127.0.0.1:9001';
export const adminEmail = process.env.ADMIN_EMAIL || 'sysadmin@sample.mattermost.com';
export const adminUsername = process.env.ADMIN_USERNAME || 'sysadmin';
export const adminPassword = process.env.ADMIN_PASSWORD || 'Sys@dmin-sample1';
export const ldapServer = process.env.LDAP_SERVER || '127.0.0.1';
export const ldapPort = process.env.LDAP_PORT || 389;
