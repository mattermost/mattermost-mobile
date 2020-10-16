// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Ldap, Setup, System, Team, User} from '@support/server_api';
import {serverUrl} from '@support/test_config';
import ldapUsers from '@support/fixtures/ldap_users.json';

describe('Smoke Tests', () => {
    const testOne = ldapUsers['test-1'];
    let config;

    beforeAll(async () => {
        // * Verify that the server has license with LDAP feature
        await System.apiRequireLicenseForFeature('LDAP');

        // # Enable LDAP
        ({config} = await System.apiUpdateConfig({LdapSettings: {Enable: true}}));

        // * Check that LDAP server can connect and is synchronized with Mattermost server
        await Ldap.apiRequireLDAPServer();

        await ensureUserHasTeam(testOne);
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
        await element(by.text(config.TeamSettings.SiteName)).tap();

        // # Type in password
        await element(by.id('password_input')).replaceText(testOne.password);

        // # Tap anywhere to hide keyboard
        await element(by.text(config.TeamSettings.SiteName)).tap();

        // # Tap "Sign in" button
        await element(by.text('Sign in')).tap();

        // * Verify that the user has successfully logged in by checking it redirects into the Channel screen
        await expect(element(by.id('channel_screen'))).toBeVisible();
    });
});

async function ensureUserHasTeam(ldapUser) {
    // # Login as LDAP user to sync with the server
    await User.apiLogin(ldapUser);

    // # Login as sysadmin and ensure LDAP user is member of at least one team
    await User.apiAdminLogin();
    const {user} = await User.apiGetUserByUsername(ldapUser.username);
    const {teams} = await Team.apiGetTeamMembersForUser(user.id);

    if (!teams?.length) {
        const {team} = await Setup.apiInit();
        await Team.apiAddUserToTeam(user.id, team.id);
    }
}
