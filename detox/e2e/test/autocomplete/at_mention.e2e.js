// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {toChannelScreen} from '@support/ui/screen';

import {Setup} from '@support/server_api';

describe('Autocomplete', () => {
    let user;
    let postInput;

    beforeAll(async () => {
        ({user} = await Setup.apiInit());
        await toChannelScreen(user);
    });

    beforeEach(async () => {
        await device.reloadReactNative();

        // # Select post draft
        await expect(element(by.id('channel_screen'))).toBeVisible();
        postInput = await element(by.id('post_input'));
        await postInput.tap();
    });

    it('MM-T3409_1 should suggest user based on username', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type username
        await postInput.typeText(user.username);

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).toExist();
    });

    it('MM-T3409_2 should suggest user based on nickname', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type nickname
        await postInput.typeText(user.nickname);

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).toExist();
    });

    it('MM-T3409_3 should suggest user based on first name', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type first name
        await postInput.typeText(user.first_name);

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).toExist();
    });

    it('MM-T3409_4 should suggest user based on last name', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type last name
        await postInput.typeText(user.last_name);

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).toExist();
    });

    it('MM-T3409_5 should suggest user based on lowercase first name', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type lowercase first name
        await postInput.typeText(user.first_name.toLowerCase());

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).toExist();
    });

    it('MM-T3409_6 should suggest user based on lowercase last name', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type lowercase last name
        await postInput.typeText(user.last_name.toLowerCase());

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).toExist();
    });

    it('MM-T3409_7 should suggest user based on full name with space', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type full name
        await postInput.typeText(`${user.first_name} ${user.last_name}`);

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).toExist();
    });

    it('MM-T3409_8 should suggest user based on partial full name with space', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type partial full name
        await postInput.typeText(`${user.first_name} ${user.last_name.substring(0, user.last_name.length - 6)}`);

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).toExist();
    });

    it('MM-T3409_9 should stop suggesting user after full name with trailing space', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type full name
        await postInput.typeText(`${user.first_name} ${user.last_name}`);

        // * Expect at mention autocomplete to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).toExist();

        // # Type trailing space
        await postInput.typeText(' ');

        // * Expect at mention autocomplete not to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).not.toExist();
    });

    it('MM-T3409_10 should stop suggesting user when keyword is not associated with any user', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await postInput.typeText('@');
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();

        // # Type keyword not associated with any user
        await postInput.typeText(Date.now().toString());

        // * Expect at mention autocomplete not to contain associated user suggestion
        await expect(element(by.id(`autocomplete.at_mention.item.${user.id}`))).not.toExist();
    });
});
