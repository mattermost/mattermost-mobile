// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect} from 'detox';

class TableScreen {
    testID = {
        tableScreen: 'table.screen',
        tableScrollView: 'table.scroll_view',
        backButton: 'screen.back.button',
    };

    tableScreen = element(by.id(this.testID.tableScreen));
    tableScrollView = element(by.id(this.testID.tableScrollView));
    backButton = element(by.id(this.testID.backButton));

    toBeVisible = async () => {
        await expect(this.tableScreen).toBeVisible();

        return this.tableScreen;
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.tableScreen).not.toBeVisible();
    };
}

const tableScreen = new TableScreen();
export default tableScreen;
