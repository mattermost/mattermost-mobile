// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const serverOneUrl = process.env.SITE_1_URL || (process.env.IOS === 'true' ? 'https://plugins.test.mattermost.cloud' : 'http://10.0.2.2:8065');
export const siteOneUrl = 'https://plugins.test.mattermost.cloud';
export const serverTwoUrl = 'https://test-9-9-1-rc1.test.mattermost.cloud';
export const siteTwoUrl = process.env.SITE_2_URL || 'http://localhost:8065';
export const serverThreeUrl = process.env.SITE_3_URL || 'http://localhost:8065';
export const siteThreeUrl = process.env.SITE_3_URL || 'http://localhost:8065';
export const smtpUrl = process.env.SMTP_URL || 'http://127.0.0.1:9001';
export const adminEmail = process.env.ADMIN_EMAIL || 'sysadmin@sample.mattermost.com';
export const adminUsername = 'admin';
export const adminPassword = 'admin@xqatw5wyofn4xyr6kmtr99kjqy';
export const ldapServer = process.env.LDAP_SERVER || '127.0.0.1';
export const ldapPort = process.env.LDAP_PORT || 389;
