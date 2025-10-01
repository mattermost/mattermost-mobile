// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class InteractiveDialogScreen {
    testID = {
        interactiveDialogScreen: 'interactive_dialog.screen',
        dialogTitle: 'interactive_dialog.dialog_title',
        dialogIntroText: 'interactive_dialog.dialog_introduction_text',
        submitButton: 'interactive_dialog.submit.button',
        cancelButton: 'interactive_dialog.cancel.button',

        // Dialog elements use a pattern: dialog_element.{element_name}.{element_type}
        dialogElementPrefix: 'dialog_element.',
        integrationSelector: 'integration_selector',
    };

    interactiveDialogScreen = element(by.id(this.testID.interactiveDialogScreen));
    submitButton = element(by.id(this.testID.submitButton));
    cancelButton = element(by.id(this.testID.cancelButton));

    // Platform-specific cancel button (following Alert pattern)
    platformCancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(0);

    // AppsForm close button (X button in header) - using the testID from buildNavigationButton
    appsFormCloseButton = element(by.id('close.more_direct_messages.button'));

    // Helper to get a dialog element by name and type
    getDialogElement = (elementName: string, elementType: string = 'text') => {
        return element(by.id(`${this.testID.dialogElementPrefix}${elementName}.${elementType}`));
    };

    // Helper to fill a text input - supports both InteractiveDialog and AppsForm patterns
    fillTextElement = async (elementName: string, value: string) => {
        // For password and textarea fields, we need special handling for keyboard visibility
        const isPasswordOrTextarea = elementName === 'password_field' || elementName === 'textarea_field';

        if (isPasswordOrTextarea) {
            try {
                const dialogScrollView = element(by.id('interactive_dialog.screen'));
                await dialogScrollView.scroll(200, 'down');
                await wait(500);
            } catch (scrollError) {
                // Could not scroll dialog for password/textarea field
            }
        } else {
            try {
                const dialogScrollView = element(by.id('interactive_dialog.screen'));
                await dialogScrollView.scroll(100, 'down');
            } catch (scrollError) {
                // Could not scroll dialog, continuing without scroll
            }
        }

        // Try AppsForm pattern first (for DialogRouter)
        const appsFormElement = element(by.id(`AppFormElement.${elementName}`));
        try {
            await expect(appsFormElement).toExist();
            await appsFormElement.typeText(value);

            // Enhanced keyboard dismissal for problematic fields
            await wait(isPasswordOrTextarea ? 1500 : 1000);

            // Try multiple ways to dismiss keyboard
            try {
                // Method 1: Tap dialog header
                const dialogHeader = element(by.id('interactive_dialog.dialog_title'));
                await dialogHeader.tap();
            } catch (headerTapError) {
                try {
                    // Method 2: Tap outside the field
                    const dialogContainer = element(by.id('interactive_dialog.screen'));
                    await dialogContainer.tap();
                } catch (containerTapError) {
                    // Method 3: Just wait for keyboard to settle
                    await wait(1000);
                }
            }
        } catch (appsFormError) {
            // Fallback to InteractiveDialog pattern
            const interactiveDialogElement = this.getDialogElement(elementName, 'text_input');
            try {
                await expect(interactiveDialogElement).toExist();
                await interactiveDialogElement.typeText(value);

                // Same enhanced keyboard handling for fallback
                await wait(isPasswordOrTextarea ? 1500 : 1000);
                try {
                    const dialogHeader = element(by.id('interactive_dialog.dialog_title'));
                    await dialogHeader.tap();
                } catch (headerTapError) {
                    await wait(500);
                }
            } catch (interactiveError) {
                // Failed to find field with both patterns
                throw new Error(`Could not find text field: ${elementName}`);
            }
        }
    };

    // Helper to tap a select element (opens IntegrationSelector)
    tapSelectElement = async (elementName: string) => {
        const selectElement = this.getDialogElement(elementName, 'select');
        await expect(selectElement).toExist();
        await selectElement.tap();
    };

    // Helper to toggle a boolean element (checkbox/switch) - supports both AppsForm and InteractiveDialog patterns
    toggleBooleanElement = async (elementName: string) => {

        // Try BoolSetting patterns first
        try {
            const testElement1 = element(by.id(`AppFormElement.${elementName}.toggled..button`));
            await expect(testElement1).toExist();
            await testElement1.tap();
            return;
        } catch (error) {
            // Pattern not found, try next
        }

        try {
            const testElement2 = element(by.id(`AppFormElement.${elementName}.toggled.true.button`));
            await expect(testElement2).toExist();
            await testElement2.tap();
            return;
        } catch (error) {
            // Pattern not found, try next
        }

        try {
            const testElement3 = element(by.id(`AppFormElement.${elementName}.toggled.false.button`));
            await expect(testElement3).toExist();
            await testElement3.tap();
            return;
        } catch (error) {
            // Pattern not found, try next
        }

        // Try OptionItem patterns
        try {
            const testElement4 = element(by.id(`AppFormElement.${elementName}.option.toggled.false.button`));
            await expect(testElement4).toExist();
            await testElement4.tap();
            return;
        } catch (error) {
            // Pattern not found, try next
        }

        try {
            const testElement5 = element(by.id(`AppFormElement.${elementName}.option.toggled.true.button`));
            await expect(testElement5).toExist();
            await testElement5.tap();
            return;
        } catch (error) {
            // Pattern not found, try next
        }

        // Fallback to InteractiveDialog pattern
        const interactiveDialogElement = this.getDialogElement(elementName, 'bool');
        try {
            await expect(interactiveDialogElement).toExist();
            await interactiveDialogElement.tap();
        } catch (interactiveError) {
            throw new Error(`Could not find boolean field: ${elementName}`);
        }
    };

    // Submit the dialog
    submit = async () => {
        // Try InteractiveDialog pattern
        try {
            const submitElement1 = element(by.id('interactive_dialog.submit.button'));
            await expect(submitElement1).toExist();
            await submitElement1.tap();
            await wait(timeouts.ONE_SEC);
            return;
        } catch (error) {
            // Pattern not found, try next
        }

        // Try AppsForm pattern
        try {
            const submitElement2 = element(by.id('AppsForm.submit.button'));
            await expect(submitElement2).toExist();
            await submitElement2.tap();
            await wait(timeouts.ONE_SEC);
            return;
        } catch (error) {
            // Pattern not found, try next
        }

        // Try alternative AppsForm pattern
        try {
            const submitElement3 = element(by.id('apps_form.submit.button'));
            await expect(submitElement3).toExist();
            await submitElement3.tap();
            await wait(timeouts.ONE_SEC);
            return;
        } catch (error) {
            // Pattern not found, try next
        }

        // Try generic submit pattern
        try {
            const submitElement4 = element(by.id('submit.button'));
            await expect(submitElement4).toExist();
            await submitElement4.tap();
            await wait(timeouts.ONE_SEC);
            return;
        } catch (error) {
            // Pattern not found, try text-based fallback
        }

        // Try text-based fallback
        try {
            const submitByText = element(by.text('Submit'));
            await expect(submitByText).toExist();
            await submitByText.tap();
            await wait(timeouts.ONE_SEC);
        } catch (textError) {
            throw new Error('Could not find submit button with any pattern');
        }
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
