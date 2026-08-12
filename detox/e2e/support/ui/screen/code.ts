// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isIos, timeouts} from '@support/utils';
import {waitFor} from 'detox';

class CodeScreen {
    testID = {
        title: 'code.screen.title',
        backButton: 'code.screen.back',
    };

    title = element(by.id(this.testID.title));
    backButton = element(by.id(this.testID.backButton));

    toBeVisible = async () => {
        await waitFor(this.title).toBeVisible().withTimeout(timeouts.TEN_SEC);
        return this.title;
    };

    // Unique back testID (MM-70011) — avoids duplicate navigation.header.back under expo-router.
    // iOS: tapAtPoint for Detox frame offset; Android: plain tap, hardware back as caller fallback.
    back = async () => {
        await waitFor(this.backButton).toExist().withTimeout(timeouts.TEN_SEC);
        if (isIos()) {
            try {
                await this.backButton.tapAtPoint({x: 12, y: 12});
            } catch {
                await this.backButton.tap();
            }
        } else {
            await this.backButton.tap();
        }
        await waitFor(this.title).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const codeScreen = new CodeScreen();
export default codeScreen;
