// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SearchBar} from '@support/ui/component';
import {TimezoneDisplaySettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class SelectTimezoneScreen {
    testID = {
        selectTimezoneScreenPrefix: 'select_timezone.',
        timezoneRowPrefix: 'select_timezone.timezone_row.',
        selectTimezoneScreen: 'select_timezone.screen',
        backButton: 'screen.back.button',
        flatTimezoneList: 'select_timezone.timezone.flat_list',
    };

    selectTimezoneScreen = element(by.id(this.testID.selectTimezoneScreen));
    backButton = element(by.id(this.testID.backButton));
    flatTimezoneList = element(by.id(this.testID.flatTimezoneList));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.selectTimezoneScreenPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.selectTimezoneScreenPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.selectTimezoneScreenPrefix);
    clearButton = SearchBar.getClearButton(this.testID.selectTimezoneScreenPrefix);

    getNonSelectedTimezoneRow = (timezone: string) => {
        return element(by.id(`${this.testID.timezoneRowPrefix}${timezone}`));
    };

    getSelectedTimezoneRow = (timezone: string) => {
        return element(by.id(`${this.testID.timezoneRowPrefix}${timezone}.selected`));
    };

    toBeVisible = async () => {
        await waitFor(this.selectTimezoneScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.selectTimezoneScreen;
    };

    open = async () => {
        // # Open select timezone screen
        await TimezoneDisplaySettingsScreen.manualOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.selectTimezoneScreen).not.toBeVisible();
    };
}

const selectTimezoneScreen = new SelectTimezoneScreen();
export default selectTimezoneScreen;
