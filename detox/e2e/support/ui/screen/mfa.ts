// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts, wait} from '@support/utils';
import {waitFor} from 'detox';

class MfaScreen {
    testID = {
        mfaScreen: 'mfa.screen',
        tokenInput: 'login_mfa.input',
        submitButton: 'login_mfa.submit',
    };

    mfaScreen = element(by.id(this.testID.mfaScreen));
    tokenInput = element(by.id(this.testID.tokenInput));
    submitButton = element(by.id(this.testID.submitButton));

    toBeVisible = async () => {
        await waitFor(this.mfaScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.mfaScreen;
    };

    /**
     * Enter an MFA token and submit the MFA form.
     * @param {string} token - the TOTP code to enter
     */
    submitToken = async (token: string) => {
        await this.toBeVisible();
        await this.tokenInput.replaceText(token);

        // Allow the controlled input's onChangeText to propagate so the submit
        // button (disabled until a token is present) becomes tappable.
        await wait(timeouts.ONE_SEC);
        await this.submitButton.tap();
    };
}

const mfaScreen = new MfaScreen();
export default mfaScreen;
