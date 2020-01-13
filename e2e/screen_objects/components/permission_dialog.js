// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AppScreen from '../app_screen';

const SELECTORS = {
    ALLOW_BUTTON: browser.isAndroid ? '~OK' : '~Allow',
    DENY_BUTTON: browser.isAndroid ? '~DENY' : '~Don\'t Allow',
};

class PermissionDialog extends AppScreen {
    constructor() {
        super(SELECTORS.ALLOW_BUTTON);
    }

    get allowButton() {
        return $(SELECTORS.ALLOW_BUTTON);
    }

    get denyButton() {
        return $(SELECTORS.DENY_BUTTON);
    }

    clickAllowButton() {
        this.allowButton.click();
    }

    clickDenyButton() {
        this.denyButton.click();
    }
}

export default new PermissionDialog();
