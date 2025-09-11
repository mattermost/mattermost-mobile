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
            // More aggressive scrolling for keyboard-problematic fields
            try {
                const dialogScrollView = element(by.id('interactive_dialog.screen'));
                await dialogScrollView.scroll(200, 'down');
                await wait(500);
            } catch (scrollError) {
                console.log('Could not scroll dialog for password/textarea field');
            }
        } else {
            // Regular scrolling for other fields
            try {
                const dialogScrollView = element(by.id('interactive_dialog.screen'));
                await dialogScrollView.scroll(100, 'down');
            } catch (scrollError) {
                console.log('Could not scroll dialog, continuing without scroll');
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
            return;
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
                console.log(`Failed to find field ${elementName} with both patterns. AppsForm error:`, appsFormError);
                console.log('InteractiveDialog error:', interactiveError);
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
        console.log(`🔍 Looking for boolean field: ${elementName}`);
        
        // Try BoolSetting patterns first (now that we added testID to BoolSetting)
        const boolSettingPatterns = [
            // Try with empty string (this is the actual pattern for false values!)
            `AppFormElement.${elementName}.toggled..button`,
            `AppFormElement.${elementName}.toggled.true.button`,
            `AppFormElement.${elementName}.toggled.false.button`,
        ];
        
        console.log(`🔄 Trying BoolSetting toggle patterns for ${elementName}...`);
        for (const pattern of boolSettingPatterns) {
            try {
                const testElement = element(by.id(pattern));
                await expect(testElement).toExist();
                await testElement.tap();
                console.log(`✅ Successfully toggled boolean element: ${elementName} with BoolSetting pattern: ${pattern}`);
                return;
            } catch (error) {
                console.log(`❌ BoolSetting pattern "${pattern}" not found`);
            }
        }
        
        // Try OptionItem patterns (for settings screens that use SettingOption/OptionItem)
        const optionItemPatterns = [
            `AppFormElement.${elementName}.option.toggled.false.button`,
            `AppFormElement.${elementName}.option.toggled.true.button`,
        ];
        
        console.log(`🔄 Trying OptionItem toggle patterns for ${elementName}...`);
        for (const pattern of optionItemPatterns) {
            try {
                const testElement = element(by.id(pattern));
                await expect(testElement).toExist();
                await testElement.tap();
                console.log(`✅ Successfully toggled boolean element: ${elementName} with OptionItem pattern: ${pattern}`);
                return;
            } catch (error) {
                console.log(`❌ OptionItem pattern "${pattern}" not found`);
            }
        }
        
        // Debug: Let's see what elements actually exist for this field
        console.log(`🔍 Debug: Checking what elements exist for ${elementName}...`);
        
        // Check label exists
        try {
            const labelElement = element(by.id(`AppFormElement.${elementName}.label`));
            await expect(labelElement).toExist();
            console.log(`✅ Found label: AppFormElement.${elementName}.label`);
        } catch (labelError) {
            console.log(`❌ Label not found: AppFormElement.${elementName}.label`);
        }
        
        // Check base element exists
        try {
            const baseElement = element(by.id(`AppFormElement.${elementName}`));
            await expect(baseElement).toExist();
            console.log(`✅ Found base element: AppFormElement.${elementName}`);
        } catch (baseError) {
            console.log(`❌ Base element not found: AppFormElement.${elementName}`);
        }
        
        // Try more exhaustive search for any Switch-related testIDs
        console.log(`🔍 Trying additional Switch testID patterns for ${elementName}...`);
        const additionalPatterns = [
            // Direct Switch testIDs (our fix should create these)
            `AppFormElement.${elementName}.toggled.false.button`,
            `AppFormElement.${elementName}.toggled.true.button`,
            // Variations in case there are slight differences
            `${elementName}.toggled.false.button`,
            `${elementName}.toggled.true.button`,
            `${elementName}_toggle`,
            `${elementName}_switch`,
            // Try without .button suffix
            `AppFormElement.${elementName}.toggled.false`,
            `AppFormElement.${elementName}.toggled.true`,
        ];
        
        for (const pattern of additionalPatterns) {
            try {
                const testElement = element(by.id(pattern));
                await expect(testElement).toExist();
                console.log(`🎯 FOUND SWITCH: ${pattern}!`);
                await testElement.tap();
                console.log(`✅ Successfully tapped Switch: ${pattern}`);
                return;
            } catch (error) {
                console.log(`❌ Not found: ${pattern}`);
            }
        }
        
        // Fallback to InteractiveDialog pattern
        const interactiveDialogElement = this.getDialogElement(elementName, 'bool');
        try {
            await expect(interactiveDialogElement).toExist();
            await interactiveDialogElement.tap();
            console.log(`✅ Toggled boolean element: ${elementName} (InteractiveDialog pattern)`);
            return;
        } catch (interactiveError) {
            console.log(`❌ InteractiveDialog pattern failed: dialog_element.${elementName}.bool`);
            throw new Error(`Could not find boolean field: ${elementName}`);
        }
    };

    // Submit the dialog
    submit = async () => {
        console.log('🔍 DEBUG: Looking for submit button...');
        
        // Try multiple submit button patterns
        const submitPatterns = [
            'interactive_dialog.submit.button',  // InteractiveDialog pattern
            'AppsForm.submit.button',           // AppsForm pattern
            'apps_form.submit.button',          // Alternative AppsForm pattern
            'submit.button',                    // Generic submit pattern
        ];
        
        for (const pattern of submitPatterns) {
            try {
                console.log(`🔍 DEBUG: Trying submit button pattern: ${pattern}`);
                const submitElement = element(by.id(pattern));
                await expect(submitElement).toExist();
                await submitElement.tap();
                console.log(`✅ DEBUG: Successfully tapped submit button: ${pattern}`);
                await wait(timeouts.ONE_SEC);
                return;
            } catch (error) {
                console.log(`❌ DEBUG: Submit button not found: ${pattern}`);
            }
        }
        
        // Try text-based fallback
        try {
            console.log('🔍 DEBUG: Trying submit button by text...');
            const submitByText = element(by.text('Submit'));
            await expect(submitByText).toExist();
            await submitByText.tap();
            console.log('✅ DEBUG: Successfully tapped submit button by text');
            await wait(timeouts.ONE_SEC);
            return;
        } catch (textError) {
            console.log('❌ DEBUG: Submit button by text not found');
        }
        
        throw new Error('Could not find submit button with any pattern');
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

    toBeVisible = async () => {
        await waitFor(this.interactiveDialogScreen).toExist().withTimeout(timeouts.TEN_SEC);
    };
}

const interactiveDialogScreen = new InteractiveDialogScreen();
export default interactiveDialogScreen;