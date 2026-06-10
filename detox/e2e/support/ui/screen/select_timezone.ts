// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SearchBar} from '@support/ui/component';
import {TimezoneDisplaySettingsScreen} from '@support/ui/screen';
import {isIos, tapNativeBackButton, timeouts} from '@support/utils';
import {expect} from 'detox';

class SelectTimezoneScreen {
    testID = {
        selectTimezoneScreenPrefix: 'select_timezone.',
        timezoneRowPrefix: 'select_timezone.timezone_row.',
        selectTimezoneScreen: 'select_timezone.screen',
        backButton: 'navigation.header.back',
        flatTimezoneList: 'select_timezone.timezone.flat_list',
    };

    selectTimezoneScreen = element(by.id(this.testID.selectTimezoneScreen));

    // expo-router native stack screen — the custom NavigationHeader's
    // `navigation.header.back` testID is NOT rendered on either platform.
    // iOS surfaces the chevron via `accessibilityLabel="Back"`; Android via
    // the AppCompat Toolbar's default navigation-icon contentDescription
    // `Navigate up`. Mirrors timezone_display_settings.ts.
    get backButton(): Detox.NativeElement {
        return isIos()
            ? element(by.label('Back')).atIndex(0)
            : element(by.label('Navigate up')).atIndex(0);
    }

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
        // Use platform-native back chevron via tapNativeBackButton — the
        // custom NavigationHeader testID does not exist on this screen
        // (expo-router native stack).
        await tapNativeBackButton();
        await expect(this.selectTimezoneScreen).not.toBeVisible();
    };
}

const selectTimezoneScreen = new SelectTimezoneScreen();
export default selectTimezoneScreen;
