// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AppScreen from './app_screen';

const SELECTORS = {
    LOGIN_OPTIONS_SCREEN: '~login options screen',
    EMAIL_LOGIN_OPTION_BUTTON: '~email login option button',
    ONE_LOGIN_OPTION_BUTTON: '~one login option button',
};

class LoginOptionsScreen extends AppScreen {
    constructor() {
        super(SELECTORS.LOGIN_OPTIONS_SCREEN);
    }

    get emailLoginOptionButon() {
        return $(SELECTORS.EMAIL_LOGIN_OPTION_BUTTON);
    }

    get oneLoginOptionButton() {
        return $(SELECTORS.ONE_LOGIN_OPTION_BUTTON);
    }

    clickEmailLoginOptionButton() {
        this.emailLoginOptionButon.click();
    }

    clickOneLoginOptionButton() {
        this.oneLoginOptionButton.click();
    }
}

export default new LoginOptionsScreen();
