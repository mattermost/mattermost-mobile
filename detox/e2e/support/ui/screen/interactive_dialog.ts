// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, scrollElementIntoView, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class InteractiveDialogScreen {
    // BlocksDialogShell exposes the scroll view as the dialog container (no separate .screen id).
    testID = {
        scrollView: 'interactive_dialog.scroll_view',
        submitButton: 'interactive_dialog.submit.button',
        closeButton: 'close.interactive_dialog.button',
        cancelButton: 'interactive_dialog.cancel.button',
        error: 'interactive_dialog.error',
        integrationSelector: 'integration_selector',

        // DateTimeSelector hardcodes this picker id even when used from mm_blocks fields.
        nativeDateTimePicker: 'custom_status_clear_after.date_time_picker',
    };

    scrollView = element(by.id(this.testID.scrollView));

    // Alias for callers that historically treated the scroll view as the screen container.
    interactiveDialogScreen = this.scrollView;

    submitButton = element(by.id(this.testID.submitButton));
    closeButton = element(by.id(this.testID.closeButton));
    cancelButton = element(by.id(this.testID.cancelButton));
    nativeDateTimePicker = element(by.id(this.testID.nativeDateTimePicker));

    platformCancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(0);

    // Close button (X in header) — set in app/routes/(modals)/dialog_router.tsx
    appsFormCloseButton = element(by.id(this.testID.closeButton));

    textInputTestID = (elementName: string) => `mm_blocks.text_input.${elementName}`;
    textInputFieldTestID = (elementName: string) => `${this.textInputTestID(elementName)}.input`;
    textInputLabelTestID = (elementName: string) => `${this.textInputTestID(elementName)}.label`;
    textInputEditButtonTestID = (elementName: string) => `${this.textInputTestID(elementName)}.edit.button`;
    boolInputTestID = (elementName: string, value: boolean) => `mm_blocks.bool_input.${elementName}.toggled.${value}.button`;
    boolInputLabelTestID = (elementName: string) => `mm_blocks.bool_input.${elementName}.label`;
    selectInputTestID = (elementName: string) => `mm_blocks.select_input.${elementName}`;
    selectInputLabelTestID = (elementName: string) => `${this.selectInputTestID(elementName)}.label`;
    selectButtonTestID = (elementName: string) => `${this.selectInputTestID(elementName)}.select.button`;
    radioOptionTestID = (elementName: string, optionValue: string) => `${this.selectInputTestID(elementName)}.radio.${optionValue}.button`;
    dateInputTestID = (elementName: string) => `mm_blocks.date_input.${elementName}`;
    dateInputLabelTestID = (elementName: string) => `${this.dateInputTestID(elementName)}.label`;
    dateSelectButtonTestID = (elementName: string) => `${this.dateInputTestID(elementName)}.select.button`;
    dateTimeButtonTestID = (elementName: string) => `${this.dateInputTestID(elementName)}.time.button`;
    dateTimeInputTestID = (elementName: string) => `mm_blocks.datetime_input.${elementName}`;
    dateTimeInputLabelTestID = (elementName: string) => `${this.dateTimeInputTestID(elementName)}.label`;
    dateTimeSelectButtonTestID = (elementName: string) => `${this.dateTimeInputTestID(elementName)}.select.button`;
    dateTimeTimeButtonTestID = (elementName: string) => `${this.dateTimeInputTestID(elementName)}.time.button`;
    dateTimeManualTimeInputTestID = (elementName: string) => `${this.dateTimeInputTestID(elementName)}.manual_time.input`;
    fileInputTestID = (elementName: string) => `mm_blocks.file_input.${elementName}`;
    fileInputLabelTestID = (elementName: string) => `${this.fileInputTestID(elementName)}.label`;
    fileChooseFileButtonTestID = (elementName: string) => `${this.fileInputTestID(elementName)}.choose_file.button`;
    fileChooseFileButtonLabelTestID = (elementName: string) => `${this.fileChooseFileButtonTestID(elementName)}-label`;
    fileChoosePhotoButtonTestID = (elementName: string) => `${this.fileInputTestID(elementName)}.choose_photo.button`;
    fieldErrorTestID = (elementName: string) => `${elementName}-error`;
    buttonTestID = (actionId: string) => `mm_blocks.button.${actionId}`;

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
        const textInput = element(by.id(this.textInputFieldTestID(elementName)));

        await waitFor(textInput).toExist().withTimeout(timeouts.TEN_SEC);
        await scrollElementIntoView(textInput, by.id(this.testID.scrollView));
        await waitFor(textInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.setDialogInputText(textInput, value);
        await wait(isPasswordOrTextarea ? 1500 : 1000);

        // Dismiss keyboard — title lives in the nav header, so tap the scroll view.
        try {
            await this.scrollView.tap({x: 20, y: 20});
        } catch {
            await wait(1000);
        }
    };

    toggleBooleanElement = async (elementName: string) => {
        const patterns = [
            this.boolInputTestID(elementName, false),
            this.boolInputTestID(elementName, true),
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

    /**
     * Native and legacy dialogs both render interactive_dialog.submit.button in NativeDialogFooter.
     */
    submit = async () => {
        await waitFor(this.submitButton).toExist().withTimeout(timeouts.TWO_SEC);
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
        await wait(timeouts.ONE_SEC);
    };

    selectOption = async (elementName: string, optionValue: string) => {
        const selectButton = element(by.id(this.selectButtonTestID(elementName)));
        await expect(selectButton).toExist();
        await selectButton.tap();
        await wait(2000);

        const optionElement = element(by.text(optionValue));
        await expect(optionElement).toExist();
        await optionElement.tap();
        await wait(1000);

        try {
            const doneButton = element(by.text('Done'));
            await expect(doneButton).toExist();
            await doneButton.tap();
            await wait(1000);
        } catch {
            // No Done button (single-select closes on tap).
        }
    };

    selectRadioOption = async (elementName: string, optionValue: string) => {
        const radioOption = element(by.id(this.radioOptionTestID(elementName, optionValue)));
        await expect(radioOption).toExist();
        await radioOption.tap();
        await wait(500);
    };

    fillTextElementWithAppForm = async (elementName: string, value: string) => {
        // Kept for callers; dialogs now use the same mm_blocks text input IDs.
        await this.fillTextElement(elementName, value);
    };

    toBeVisible = async (shouldBeVisible: boolean = true) => {
        if (shouldBeVisible) {
            await waitFor(this.scrollView).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            await waitFor(this.scrollView).not.toExist().withTimeout(timeouts.TEN_SEC);
        }
    };
}

const interactiveDialogScreen = new InteractiveDialogScreen();
export default interactiveDialogScreen;
