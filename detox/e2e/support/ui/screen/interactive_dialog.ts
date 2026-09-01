// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

import IntegrationSelectorScreen from './integration_selector';

class InteractiveDialogScreen {
    testID = {
        interactiveDialogScreen: 'interactive_dialog.screen',

        // The scrollable is the KeyboardAwareScrollView inside the screen, not the screen
        // itself: 'interactive_dialog.screen' sits on a SafeAreaView, so scrollTo() against
        // it throws and the surrounding catch turned every scroll into a silent no-op.
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

    // Close button (X in header) - interactive dialogs render via the dialog_router route,
    // whose testID is set in app/routes/(modals)/dialog_router.tsx
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
                // Dismiss the keyboard by tapping the scroll view's own background. The form
                // sets keyboardShouldPersistTaps='handled', so a tap that no input claims
                // dismisses it. The previous target, 'interactive_dialog.dialog_title', is not
                // rendered anywhere in the app, so that tap always threw into the catch and no
                // keyboard was ever dismissed. On iOS the keyboard overlays the content rather
                // than resizing it, which is why the last field stayed unreachable there.
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

        // Same dead target as above: the old 'interactive_dialog.dialog_title' is rendered
        // nowhere, so this only ever reached its fallback. Tap the scroll view's background,
        // which the form's keyboardShouldPersistTaps='handled' turns into a dismissal.
        //
        // Not {x: 20, y: 20}: that is the scroll view's top-left, and the first control in
        // the field-refresh form is the project_type select. Depending on where the previous
        // field left the scroll offset, that corner lands on the select and REOPENS the
        // integration selector. MM-T4983 on the iOS run for 0af8631 failed exactly so --
        // React was selected, both text fields filled, then this dismissal ran at 23:20:14
        // and by 23:20:19 interactive_dialog.submit.button was gone; teardown at 23:20:33
        // found integration_selector.screen open. A tap near the bottom edge lands below the
        // last field, where the form has padding rather than controls.
        try {
            await element(by.id(this.testID.interactiveDialogScrollView)).tap({x: 20, y: 8});
        } catch {
            try {
                await this.interactiveDialogScreen.tap();
            } catch {
                await wait(1000);
            }
        }

        // Belt and braces: if the dismissal (or an earlier one) still managed to open a
        // selector, close it before the caller goes looking for the dialog's own controls.
        // Cheap when nothing is open -- one existence check.
        await this.dismissStraySelector();
    };

    /**
     * Close an integration selector that opened unintentionally, so the interactive dialog is
     * the frontmost screen again. No-op when no selector is up.
     */
    dismissStraySelector = async () => {
        try {
            await waitFor(element(by.id('integration_selector.screen'))).toExist().withTimeout(timeouts.ONE_SEC);
        } catch {
            return;
        }

        try {
            // cancel() re-checks the selector is on screen before tapping navigation back,
            // which other pushed screens also render.
            await IntegrationSelectorScreen.cancel();
        } catch {
            // Leave it to the caller's own waits to report a clearer failure than this would.
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
        // Scroll the dialog so the submit control is not obscured by the keyboard /
        // safe-area on iOS (MM-T4102 borderline visibility).
        try {
            await this.interactiveDialogScreen.scroll(200, 'down');
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
