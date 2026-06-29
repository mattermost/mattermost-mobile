// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class InteractiveDialogScreen {
    testID = {
        interactiveDialogScreen: 'interactive_dialog.screen',
        dialogTitle: 'interactive_dialog.dialog_title',
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
    appsFormCloseButton = element(by.id('close.apps_form.button'));

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
        await this.setDialogInputText(appsFormElement, value);
        await wait(isPasswordOrTextarea ? 1500 : 1000);

        try {
            const dialogHeader = element(by.id(this.testID.dialogTitle));
            await dialogHeader.tap();
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
        await expect(this.submitButton).toExist();
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

    getFileFieldChooseButton = (fieldName: string) => element(by.id(`${fieldName}.choose.button`));

    tapFileFieldChooseButton = async (fieldName: string) => {
        const chooseButton = this.getFileFieldChooseButton(fieldName);
        await waitFor(chooseButton).toExist().withTimeout(timeouts.TWO_SEC);
        await chooseButton.tap();
    };

    expectFileFieldUploadDisabledWarning = async (fieldName: string, shouldExist = true) => {
        const warning = element(by.id(`${fieldName}.upload.disabled.warning`));
        if (shouldExist) {
            await waitFor(warning).toExist().withTimeout(timeouts.TWO_SEC);
            await expect(warning).toExist();
        } else {
            await expect(warning).not.toExist();
        }
    };

    expectHydratedFilePreview = async (fieldName: string, fileId: string) => {
        const fileRow = element(by.id(`${fieldName}.file.row.${fileId}`));
        await waitFor(fileRow).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(fileRow).toExist();
    };

    expectFileFieldChooseButtonDisabled = async (fieldName: string) => {
        const btn = this.getFileFieldChooseButton(fieldName);
        await waitFor(btn).toExist().withTimeout(timeouts.TWO_SEC);
        await btn.tap();
        await waitFor(element(by.id('file_attachment.photo_library'))).not.toExist().withTimeout(timeouts.THREE_SEC);
    };

    expectFileFieldChooseButtonEnabled = async (fieldName: string) => {
        const btn = this.getFileFieldChooseButton(fieldName);
        await waitFor(btn).toExist().withTimeout(timeouts.TWO_SEC);
        await btn.tap();
        await waitFor(element(by.id('file_attachment.photo_library'))).toExist().withTimeout(timeouts.THREE_SEC);
        await element(by.id('file_attachment.photo_library')).swipe('down', 'fast', 0.5);
        await waitFor(element(by.id('file_attachment.photo_library'))).not.toExist().withTimeout(timeouts.THREE_SEC);
    };

    tapFileFieldRemoveButton = async (fieldName: string, fileId: string) => {
        const removeBtn = element(by.id(`${fieldName}.file.remove.${fileId}`));
        await waitFor(removeBtn).toExist().withTimeout(timeouts.TWO_SEC);
        await removeBtn.tap();
    };

    fillTextElementWithAppForm = async (elementName: string, value: string) => {
        const textInput = element(by.id(`AppFormElement.${elementName}.text.input`));
        await expect(textInput).toExist();
        await this.setDialogInputText(textInput, value);
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
