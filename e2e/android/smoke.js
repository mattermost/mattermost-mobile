// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const wd = require('wd');

const config = require('../config');
const serverUrl = config.ANDROID_LOCAL_SERVER_URL;
const testUser = config.USER.user1;

/* eslint-disable func-names, prefer-arrow-callback */

module.exports = function(driver, t) {
    t.test('Select server URL', async function(t) { // eslint-disable-line
        // Inspect: Server URL input
        const serverUrlInput = await driver.elementByAccessibilityId('Server URL input');
        t.ok(serverUrlInput, 'I see "Server URL input"');

        // Inspect: Connect button
        const connectButton = await driver.elementByAccessibilityId('Connect button');
        t.ok(connectButton, 'I see "Connect button"');
        t.ok(
            await driver.waitForElementByAndroidUIAutomator(
                'new UiSelector().text("Connect")',
                5000,
            ),
            '> should match button text as "Connect',
        );

        // Action: On selecting server
        const connectAction = new wd.TouchAction(driver);
        connectAction.tap({el: connectButton});
        await connectAction.perform();
        t.pass('> able to tap into it');

        t.ok(
            await driver.waitForElementByAndroidUIAutomator(
                'new UiSelector().text("URL must start with http:// or https://")',
                5000,
            ),
            '> should match error text as "URL must start with http:// or https://"',
        );

        await serverUrlInput.sendKeys(serverUrl);
        t.pass('I can type into "Server URL input"');
        const textInput = await serverUrlInput.text();
        t.equal(textInput, serverUrl, '> should match text input');

        await connectAction.perform();

        await driver.sleep(5000);
        t.end();
    });

    t.test('User login', async function(t) { // eslint-disable-line

        // Inspect: Email address input
        const emailAddressInput = await driver.elementByAccessibilityId('Email address input');
        t.ok(emailAddressInput, 'I see "Email address input"');

        // Inspect: Password input
        const passwordInput = await driver.elementByAccessibilityId('Password input');
        t.ok(passwordInput, 'I see "Password input"');

        // Inspect: Sign in button
        const signinButton = await driver.elementByAccessibilityId('Sign in button');
        t.ok(signinButton, 'I see "Sign in button"');

        // Inspect: Forgot password button
        const forgotPasswordButton = await driver.elementByAccessibilityId('Forgot password button');
        t.ok(forgotPasswordButton, 'I see "Forgot password button"');

        // Action: On logging in as user-1
        const signinAction = new wd.TouchAction(driver);
        signinAction.tap({el: signinButton});
        await signinAction.perform();
        t.pass('I can tap into "Sign in button"');

        t.ok(
            await driver.waitForElementByAndroidUIAutomator(
                'new UiSelector().text("Please enter your email or username")',
                5000,
            ),
            '> should match error text as "Please enter your email or username"',
        );

        await emailAddressInput.sendKeys(testUser.username);
        t.pass('I can type into "Email address input"');
        const emailTextInput = await emailAddressInput.text();
        t.equal(emailTextInput, testUser.username, '> should match text input');

        await passwordInput.sendKeys(testUser.username);
        t.pass('I can type into "Password input"');

        await signinAction.perform();
        await driver.sleep(5000);
        t.ok(
            await driver.waitForElementByAndroidUIAutomator(
                'new UiSelector().text("Town Square")',
                5000,
            ),
            'I see the user logged in and landed on "Town Square"',
        );

        t.end();
    });
};
