// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DEFAULT_TIMEOUT} from '../utils/constants';

const SELECTORS = {
    LOGO_IMAGE: '~logo image',
};

export default class AppScreen {
    constructor(selector) {
        this.selector = selector;
    }

    get logoImage() {
        return $(SELECTORS.LOGO_IMAGE);
    }

    /**
     * Wait for the login screen to be visible
     *
     * @param {boolean} isShown
     * @return {boolean}
     */
    waitForIsShown(isShown = true) {
        return $(this.selector).waitForDisplayed(DEFAULT_TIMEOUT, !isShown);
    }
}
