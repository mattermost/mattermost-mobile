// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class InteractiveDialogScreen {
    testID = {
        interactiveDialogScreen: 'interactive_dialog.screen',
        interactiveDialogScrollView: 'interactive_dialog.scroll_view',
        submitButton: 'interactive_dialog.submit.button',
        closeButton: 'close.interactive_dialog.button',
        cancelButton: 'interactive_dialog.cancel.button',
        integrationSelector: 'integration_selector',
    };

    interactiveDialogScreen = element(by.id(this.testID.interactiveDialogScreen));
    submitButton = element(by.id(this.testID.submitButton));
    closeButton = element(by.id(this.testID.closeButton));
    cancelButton = element(by.id(this.testID.cancelButton));

    platformCancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(0);

    appsFormCloseButton = element(by.id('close.interactive_dialog.button'));

    // replaceText avoids the iOS paste-permission dialog (MM-66558).
    setDialogInputText = async (input: Detox.NativeElement, value: string) => {
        await input.tap();
        try {
            await input.clearText();
        } catch {
            // Field may already be empty.
        }
        await input.replaceText(value);
    };

    fillTextElement = async (elementName: string, value: string) => {
        const isPasswordOrTextarea = elementName === 'password_field' || elementName === 'textarea_field';

        try {
            const dialogScrollView = element(by.id(this.testID.interactiveDialogScrollView));
            if (isPasswordOrTextarea) {
                try {
                    await dialogScrollView.tap({x: 20, y: 20});
                    await wait(500);
                } catch {
                    // No keyboard up, or the tap landed on a field — scrolling still helps.
                }
                await dialogScrollView.scrollTo('bottom');
                await wait(500);
            } else {
                await dialogScrollView.scroll(100, 'down');
            }
        } catch (scrollError) {
            // Could not scroll dialog, continuing without scroll
        }

        const appsFormElement = element(by.id(`AppFormElement.${elementName}.input`));
        await waitFor(appsFormElement).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await expect(appsFormElement).toExist();
        await this.setDialogInputText(appsFormElement, value);
        await wait(isPasswordOrTextarea ? 1500 : 1000);

        try {
            await element(by.id(this.testID.interactiveDialogScrollView)).tap({x: 20, y: 20});
        } catch {
            try {
                await this.interactiveDialogScreen.tap();
            } catch {
                await wait(1000);
            }
        }
    };

    toggleBooleanElement = async (elementName: string) => {
        const patterns = [
            `AppFormElement.${elementName}.toggled..button`,
            `AppFormElement.${elementName}.toggled.true.button`,
            `AppFormElement.${elementName}.toggled.false.button`,
            `AppFormElement.${elementName}.option.toggled.false.button`,
            `AppFormElement.${elementName}.option.toggled.true.button`,
        ];

        for (const id of patterns) {
            try {
                const testElement = element(by.id(id));

                // eslint-disable-next-line no-await-in-loop
                await expect(testElement).toExist();

                // eslint-disable-next-line no-await-in-loop
                await testElement.tap();
                return;
            } catch {
                // Pattern not found, try next
            }
        }

        throw new Error(`Could not find boolean field: ${elementName}`);
    };

    submit = async () => {
        try {
            await element(by.id(this.testID.interactiveDialogScrollView)).scroll(200, 'down');
        } catch { /* short dialogs may not scroll */ }
        await waitFor(this.submitButton).toBeVisible(40).withTimeout(timeouts.TEN_SEC);
        await this.submitButton.tap();
        await wait(timeouts.ONE_SEC);
    };

    // Try close buttons, then platform cancel.
    cancel = async () => {
        try {
            await waitFor(this.closeButton).toExist().withTimeout(timeouts.TWO_SEC);
            await this.closeButton.tap();
        } catch {
            try {
                await expect(this.appsFormCloseButton).toExist();
                await this.appsFormCloseButton.tap();
            } catch {
                try {
                    await expect(this.cancelButton).toExist();
                    await this.cancelButton.tap();
                } catch {
                    if (isAndroid()) {
                        await device.pressBack();
                    } else {
                        await expect(this.platformCancelButton).toExist();
                        await this.platformCancelButton.tap();
                    }
                }
            }
        }
        await wait(timeouts.ONE_SEC);
    };

    selectOption = async (elementName: string, optionValue: string) => {
        // Tap the select element to open IntegrationSelector
        const selectButton = element(by.id(`AppFormElement.${elementName}.select.button`));
        await expect(selectButton).toExist();
        await selectButton.tap();
        await wait(2000);

        // Wait for IntegrationSelector to appear and select the option
        const optionElement = element(by.text(optionValue));
        await expect(optionElement).toExist();
        await optionElement.tap();
        await wait(1000);

        // Confirm selection if there's a Done button
        try {
            const doneButton = element(by.text('Done'));
            await expect(doneButton).toExist();
            await doneButton.tap();
            await wait(1000);
        } catch {
            // No Done button.
        }
    };

    selectRadioOption = async (elementName: string, optionValue: string) => {
        const radioOption = element(by.id(`AppFormElement.${elementName}.radio.${optionValue}.button`));
        await expect(radioOption).toExist();
        await radioOption.tap();
        await wait(500);
    };

    fillTextElementWithAppForm = async (elementName: string, value: string) => {
        const textInput = element(by.id(`AppFormElement.${elementName}.text.input`));
        await expect(textInput).toExist();
        await this.setDialogInputText(textInput, value);
        await wait(1000);

        // Dismiss the keyboard by tapping the scroll view's background. 'screen.title.text' is
        // not rendered by this screen, so the previous target never dismissed anything.
        try {
            await element(by.id(this.testID.interactiveDialogScrollView)).tap({x: 20, y: 20});
        } catch (error) {
            // Could not dismiss keyboard, continue
        }
        await wait(500);
    };

    toBeVisible = async (shouldBeVisible: boolean = true) => {
        if (shouldBeVisible) {
            await waitFor(this.interactiveDialogScreen).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            await waitFor(this.interactiveDialogScreen).not.toExist().withTimeout(timeouts.TEN_SEC);
        }
    };
}

const interactiveDialogScreen = new InteractiveDialogScreen();
export default interactiveDialogScreen;
