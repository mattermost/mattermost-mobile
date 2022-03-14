// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

module.exports = {
    serverOneUrl: process.env.SITE_1_URL || (process.env.IOS ? 'http://127.0.0.1:8065' : 'http://10.0.2.2:8065'),
    siteOneUrl: process.env.SITE_1_URL || 'http://127.0.0.1:8065',
    smtpUrl: process.env.SMTP_URL || 'http://127.0.0.1:9001',
    adminEmail: process.env.ADMIN_EMAIL || 'sysadmin@sample.mattermost.com',
    adminUsername: process.env.ADMIN_USERNAME || 'sysadmin',
    adminPassword: process.env.ADMIN_PASSWORD || 'Sys@dmin-sample1',
    ldapServer: process.env.LDAP_SERVER || '127.0.0.1',
    ldapPort: process.env.LDAP_PORT || 389,
};
