// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';
import {waitFor} from 'detox';

class CodeScreen {
    testID = {
        title: 'code.screen.title',
    };

    title = element(by.id(this.testID.title));

    toBeVisible = async () => {
        await waitFor(this.title).toBeVisible().withTimeout(timeouts.TEN_SEC);
        return this.title;
    };
}

const codeScreen = new CodeScreen();
export default codeScreen;
