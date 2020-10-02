// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {System} from '@support/server_api';
import {serverUrl} from '@support/test_config';
import ldapUsers from '@support/fixtures/ldap_users.json';

describe('Smoke Tests', () => {
    const testOne = ldapUsers['test-1'];

    beforeAll(async () => {
        // * Verify that the server has license with LDAP feature
        await System.apiRequireLicenseForFeature('LDAP');

        // # Enable LDAP
        await System.apiUpdateConfig({LdapSettings: {Enable: true}});
    });

    it('MM-T3180 Log in - LDAP', async () => {
        // * Verify that it starts with the Select Server screen
        await expect(element(by.id('select_server_screen'))).toBeVisible();

        // # Type in the server URL
        await element(by.id('server_url_input')).replaceText(serverUrl);

        // # Tap connect button
        await element(by.text('Connect')).tap();

        // # Verify that it goes into Login screen
        await expect(element(by.id('login_screen'))).toBeVisible();

        // # Type in username
        await element(by.id('username_input')).replaceText(testOne.username);

        // # Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // # Type in password
        await element(by.id('password_input')).replaceText(testOne.password);

        // # Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // # Tap "Sign in" button
        await element(by.text('Sign in')).tap();

        // * Verify that the user has successfully logged in by checking it redirects into the Channel screen
        await expect(element(by.id('channel_screen'))).toBeVisible();
    });
});
