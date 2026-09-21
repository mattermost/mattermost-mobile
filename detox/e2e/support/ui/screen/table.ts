// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NavigationHeader} from '@support/ui/component';
import {tapNativeBackButton, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

class TableScreen {
    testID = {
        tableScreen: 'table.screen',
        tableScrollView: 'table.scroll_view',
        backButton: 'navigation.header.back',
    };

    tableScreen = element(by.id(this.testID.tableScreen));
    tableScrollView = element(by.id(this.testID.tableScrollView));
    backButton = element(by.id(this.testID.backButton));

    toBeVisible = async () => {
        await waitFor(this.tableScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.tableScreen;
    };

    back = async () => {
        try {
            await NavigationHeader.tapBackButton(1);
        } catch {
            try {
                await NavigationHeader.tapBackButton(0);
            } catch {
                await tapNativeBackButton();
            }
        }
        await expect(this.tableScreen).not.toBeVisible();
    };
}

const tableScreen = new TableScreen();
export default tableScreen;
