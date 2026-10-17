// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class IntegrationSelectorScreen {
    testID = {
        integrationSelectorScreen: 'integration_selector.screen',
        selectorItemPrefix: 'integration_selector.selector_item.',
        searchInput: 'selector.search_bar.search.input',
        doneButton: 'integration_selector.multiselect.submit.button',
        channelList: 'integration_selector.channel_list',
        userItemPrefix: 'integration_selector.user_list.user_item.',

        // The selector is a pushed screen (getHeaderOptions), so "cancel" is the
        // navigation-header back button — there is no integration_selector.cancel.button.
        cancelButton: 'navigation.header.back',
    };

    integrationSelectorScreen = element(by.id(this.testID.integrationSelectorScreen));
    searchInput = element(by.id(this.testID.searchInput));
    doneButton = element(by.id(this.testID.doneButton));
    channelList = element(by.id(this.testID.channelList));

    getChannelRow = (channelId: string) => element(by.id(`${this.testID.channelList}.${channelId}`));
    getUserItem = (userId: string) => element(by.id(`${this.testID.userItemPrefix}${userId}.${userId}`));
    getUserItemDisplayName = (userId: string) => element(by.id(`${this.testID.userItemPrefix}${userId}.${userId}.display_name`));
    cancelButton = element(by.id(this.testID.cancelButton));

    // Helper to select an option by value
    selectOption = async (optionValue: string) => {
        const optionElement = element(by.id(`${this.testID.selectorItemPrefix}${optionValue}`));
        await expect(optionElement).toExist();
        await optionElement.tap();
    };

    // Helper to search for options
    searchFor = async (searchTerm: string) => {
        await expect(this.searchInput).toExist();
        await this.searchInput.typeText(searchTerm);
        await wait(timeouts.ONE_SEC);
    };

    // Complete selection (for multiselect dialogs)
    done = async () => {
        await waitFor(this.doneButton).toExist().withTimeout(timeouts.TEN_SEC);
        await this.doneButton.tap();
        await wait(timeouts.ONE_SEC);
    };

    // Cancel selection by backing out of the pushed selector screen.
    // Guarded: navigation.header.back exists on other pushed screens too, so only
    // tap it when the selector itself is actually on screen.
    cancel = async () => {
        await waitFor(this.integrationSelectorScreen).toExist().withTimeout(timeouts.TWO_SEC);
        await this.cancelButton.tap();
        await wait(timeouts.ONE_SEC);
    };

    toBeVisible = async () => {
        await waitFor(this.integrationSelectorScreen).toExist().withTimeout(timeouts.TEN_SEC);
    };
}

const integrationSelectorScreen = new IntegrationSelectorScreen();
export default integrationSelectorScreen;

