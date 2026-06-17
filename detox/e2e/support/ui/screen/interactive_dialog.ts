// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class InteractiveDialogScreen {
    testID = {
        interactiveDialogScreen: 'interactive_dialog.screen',
        dialogTitle: 'interactive_dialog.dialog_title',
        submitButton: 'interactive_dialog.submit.button',
        cancelButton: 'interactive_dialog.cancel.button',
        integrationSelector: 'integration_selector',
    };

    interactiveDialogScreen = element(by.id(this.testID.interactiveDialogScreen));
    submitButton = element(by.id(this.testID.submitButton));
    cancelButton = element(by.id(this.testID.cancelButton));

    // Platform-specific cancel button (following Alert pattern)
    platformCancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(0);

    // AppsForm close button (X button in header) - using the testID from buildNavigationButton
    appsFormCloseButton = element(by.id('close.more_direct_messages.button'));

    // Helper to fill a text input in AppsForm
    fillTextElement = async (elementName: string, value: string) => {
        // For password and textarea fields, we need special handling for keyboard visibility
        const isPasswordOrTextarea = elementName === 'password_field' || elementName === 'textarea_field';

        try {
            const dialogScrollView = element(by.id(this.testID.interactiveDialogScreen));
            await dialogScrollView.scroll(isPasswordOrTextarea ? 200 : 100, 'down');
            if (isPasswordOrTextarea) {
                await wait(500);
            }
        } catch (scrollError) {
            // Could not scroll dialog, continuing without scroll
        }

        const appsFormElement = element(by.id(`AppFormElement.${elementName}.input`));
        await waitFor(appsFormElement).toBeVisible().withTimeout(timeouts.TWO_SEC);

        await expect(appsFormElement).toExist();
        await appsFormElement.typeText(value);

        // Enhanced keyboard dismissal for problematic fields
        await wait(isPasswordOrTextarea ? 1500 : 1000);

        // Try multiple ways to dismiss keyboard
        try {
            // Method 1: Tap dialog header
            const dialogHeader = element(by.id(this.testID.dialogTitle));
            await dialogHeader.tap();
        } catch (headerTapError) {
            try {
                // Method 2: Tap outside the field
                await this.interactiveDialogScreen.tap();
            } catch (containerTapError) {
                // Method 3: Just wait for keyboard to settle
                await wait(1000);
            }
        }
    };

    // Helper to toggle a boolean element (checkbox/switch) - tries known AppsForm patterns
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

    // Submit the dialog
    submit = async () => {
        await expect(this.submitButton).toExist();
        await this.submitButton.tap();
        await wait(timeouts.ONE_SEC);
    };

    // Cancel the dialog - tries AppsForm close button first, then fallback to platform-specific
    cancel = async () => {
        try {
            // Try AppsForm close button (X in header) - this should be the correct one
            await expect(this.appsFormCloseButton).toExist();
            await this.appsFormCloseButton.tap();
        } catch (appsFormError) {
            try {
                // Try the specific dialog cancel button ID
                await expect(this.cancelButton).toExist();
                await this.cancelButton.tap();
            } catch (idError) {
                // Fall back to platform-specific cancel button (like Alert pattern)
                await expect(this.platformCancelButton).toExist();
                await this.platformCancelButton.tap();
            }
        }
        await wait(timeouts.ONE_SEC);
    };

    // Helper to select an option from a select field (opens IntegrationSelector, selects option)
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
        } catch (error) {
            // No Done button needed, selection was immediate
        }
    };

    // Helper to select a radio option
    selectRadioOption = async (elementName: string, optionValue: string) => {
        const radioOption = element(by.id(`AppFormElement.${elementName}.radio.${optionValue}.button`));
        await expect(radioOption).toExist();
        await radioOption.tap();
        await wait(500);
    };

    // Helper to fill text element with specific input pattern for apps form
    fillTextElementWithAppForm = async (elementName: string, value: string) => {
        const textInput = element(by.id(`AppFormElement.${elementName}.text.input`));
        await expect(textInput).toExist();
        await textInput.typeText(value);
        await wait(1000);

        // Dismiss keyboard by tapping outside
        try {
            const dialogTitle = element(by.id('screen.title.text'));
            await dialogTitle.tap();
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
