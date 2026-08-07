// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, scrollElementIntoView, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

/** Synthetic submit action id for legacy Interactive Dialog → mm_blocks conversion. */
const LEGACY_DIALOG_SUBMIT_ACTION_ID = 'dialog_submit';

class InteractiveDialogScreen {
    // BlocksDialogShell exposes the scroll view; Apps Form used interactive_dialog.screen.
    testID = {
        interactiveDialogScreen: 'interactive_dialog.scroll_view',
        scrollView: 'interactive_dialog.scroll_view',
        submitButton: 'interactive_dialog.submit.button',
        legacySubmitButton: `mm_blocks.button.${LEGACY_DIALOG_SUBMIT_ACTION_ID}`,
        closeButton: 'close.interactive_dialog.button',
        cancelButton: 'interactive_dialog.cancel.button',
        error: 'interactive_dialog.error',
        integrationSelector: 'integration_selector',
    };

    interactiveDialogScreen = element(by.id(this.testID.interactiveDialogScreen));
    scrollView = element(by.id(this.testID.scrollView));
    submitButton = element(by.id(this.testID.submitButton));
    legacySubmitButton = element(by.id(this.testID.legacySubmitButton));
    closeButton = element(by.id(this.testID.closeButton));
    cancelButton = element(by.id(this.testID.cancelButton));

    platformCancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(0);

    // Close button (X in header) — set in app/routes/(modals)/dialog_router.tsx
    appsFormCloseButton = element(by.id(this.testID.closeButton));

    textInputTestID = (elementName: string) => `mm_blocks.text_input.${elementName}`;
    textInputFieldTestID = (elementName: string) => `${this.textInputTestID(elementName)}.input`;
    boolInputTestID = (elementName: string, value: boolean) => `mm_blocks.bool_input.${elementName}.toggled.${value}.button`;
    selectInputTestID = (elementName: string) => `mm_blocks.select_input.${elementName}`;
    selectButtonTestID = (elementName: string) => `${this.selectInputTestID(elementName)}.select.button`;
    radioOptionTestID = (elementName: string, optionValue: string) => `${this.selectInputTestID(elementName)}.radio.${optionValue}.button`;
    dateInputTestID = (elementName: string) => `mm_blocks.date_input.${elementName}`;
    dateTimeInputTestID = (elementName: string) => `mm_blocks.datetime_input.${elementName}`;

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
     * Native block_dialog and legacy plugin dialogs both render submit in the footer.
     * Keep a fallback for older builds that still injected mm_blocks.button.dialog_submit.
     */
    submit = async () => {
        try {
            await expect(this.submitButton).toExist();
            await this.submitButton.tap();
        } catch {
            await expect(this.legacySubmitButton).toExist();
            await this.legacySubmitButton.tap();
        }
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
