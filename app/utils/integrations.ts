// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type IntlShape} from 'react-intl';

import {isAppSelectOption, DialogElementTypes, DialogTextSubtypes} from './dialog_utils';

import type {KeyboardTypeOptions} from 'react-native';

const messages = defineMessages({
    required: {
        id: 'interactive_dialog.error.required',
        defaultMessage: 'This field is required.',
    },
    tooShort: {
        id: 'interactive_dialog.error.too_short',
        defaultMessage: 'Minimum input length is {minLength}.',
    },
    badEmail: {
        id: 'interactive_dialog.error.bad_email',
        defaultMessage: 'Must be a valid email address.',
    },
    badNumber: {
        id: 'interactive_dialog.error.bad_number',
        defaultMessage: 'Must be a number.',
    },
    badUrl: {
        id: 'interactive_dialog.error.bad_url',
        defaultMessage: 'URL must include http:// or https://.',
    },
    invalidOption: {
        id: 'interactive_dialog.error.invalid_option',
        defaultMessage: 'Must be a valid option',
    },
});

export function checkDialogElementForError(elem: DialogElement, value: any, intl: IntlShape): string | undefined | null {
    const fieldRequiredError = intl.formatMessage(messages.required);

    if (typeof value === 'undefined' && !elem.optional) {
        return fieldRequiredError;
    }

    const type = elem.type;

    if (type === DialogElementTypes.TEXT || type === DialogElementTypes.TEXTAREA) {
        if (value === '' && !elem.optional) {
            return fieldRequiredError;
        }
        if (value && value.length < elem.min_length) {
            return intl.formatMessage(messages.tooShort, {minLength: elem.min_length});
        }

        if (elem.subtype === DialogTextSubtypes.EMAIL) {
            if (value && !value.includes('@')) {
                return intl.formatMessage(messages.badEmail);
            }
        }

        if (elem.subtype === DialogTextSubtypes.NUMBER) {
            if (value && isNaN(value)) {
                return intl.formatMessage(messages.badNumber);
            }
        }

        if (elem.subtype === DialogTextSubtypes.URL) {
            if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                return intl.formatMessage(messages.badUrl);
            }
        }
    } else if (type === DialogElementTypes.RADIO) {
        if ((typeof value === 'undefined' || value === '') && !elem.optional) {
            return fieldRequiredError;
        }

        const options = elem.options;
        if (typeof value !== 'undefined' && value !== '' && Array.isArray(options)) {
            // Extract value from AppSelectOption object if needed
            const valueToCheck = isAppSelectOption(value) ? value.value : value;

            if (!options.some((e) => e.value === valueToCheck)) {
                return intl.formatMessage(messages.invalidOption);
            }
        }
    } else if (type === DialogElementTypes.SELECT) {
        // Handle empty values for both single and multiselect
        if (!elem.optional) {
            if (typeof value === 'undefined' || value === '') {
                return fieldRequiredError;
            }

            // For multiselect, also check if array is empty
            if (elem.multiselect && Array.isArray(value) && value.length === 0) {
                return fieldRequiredError;
            }
        }

        const options = elem.options;
        if (typeof value !== 'undefined' && value !== '' && Array.isArray(options)) {
            // Handle multiselect arrays
            if (elem.multiselect && Array.isArray(value)) {
                // For multiselect, check each value in the array
                for (const singleValue of value) {
                    const valueToCheck = isAppSelectOption(singleValue) ? singleValue.value : singleValue;
                    if (!options.some((e) => e.value === valueToCheck)) {
                        return intl.formatMessage(messages.invalidOption);
                    }
                }
            } else {
                // Single select validation
                const valueToCheck = isAppSelectOption(value) ? value.value : value;
                if (!options.some((e) => e.value === valueToCheck)) {
                    return intl.formatMessage(messages.invalidOption);
                }
            }
        }
    } else if (type === DialogElementTypes.BOOL) {
        // Required boolean fields must be true
        if (!elem.optional && (typeof value === 'undefined' || value !== true)) {
            return fieldRequiredError;
        }
    }

    return null;
}

// If we're returned errors that don't match any of the elements we have,
// ignore them and complete the dialog
export function checkIfErrorsMatchElements(errors: {
    [x: string]: unknown;
} = {}, elements: DialogElement[] = []) {
    const elemNames = new Set(elements.map((elem) => elem.name));
    for (const name in errors) {
        if (elemNames.has(name)) {
            return true;
        }
    }

    return false;
}

export function selectKeyboardType(subtype?: string): KeyboardTypeOptions {
    switch (subtype) {
        case 'email':
            return 'email-address';
        case 'number':
            return 'numeric';
        case 'tel':
            return 'phone-pad';
        case 'url':
            return 'url';
        default:
            return 'default';
    }
}
