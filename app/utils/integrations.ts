// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAppSelectOption, DialogElementTypes, DialogTextSubtypes, DialogErrorMessages} from './dialog_utils';

import type {KeyboardTypeOptions} from 'react-native';

type DialogError = {
    id: string;
    defaultMessage: string;
    values?: any;
};

export function checkDialogElementForError(elem: DialogElement, value: any): DialogError | undefined | null {
    const fieldRequiredError = {
        id: DialogErrorMessages.REQUIRED,
        defaultMessage: 'This field is required.',
    };

    if (typeof value === 'undefined' && !elem.optional) {
        return fieldRequiredError;
    }

    const type = elem.type;

    if (type === DialogElementTypes.TEXT || type === DialogElementTypes.TEXTAREA) {
        if (value === '' && !elem.optional) {
            return fieldRequiredError;
        }
        if (value && value.length < elem.min_length) {
            return {
                id: DialogErrorMessages.TOO_SHORT,
                defaultMessage: 'Minimum input length is {minLength}.',
                values: {minLength: elem.min_length},
            };
        }

        if (elem.subtype === DialogTextSubtypes.EMAIL) {
            if (value && !value.includes('@')) {
                return {
                    id: DialogErrorMessages.BAD_EMAIL,
                    defaultMessage: 'Must be a valid email address.',
                };
            }
        }

        if (elem.subtype === DialogTextSubtypes.NUMBER) {
            if (value && isNaN(value)) {
                return {
                    id: DialogErrorMessages.BAD_NUMBER,
                    defaultMessage: 'Must be a number.',
                };
            }
        }

        if (elem.subtype === DialogTextSubtypes.URL) {
            if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                return {
                    id: DialogErrorMessages.BAD_URL,
                    defaultMessage: 'URL must include http:// or https://.',
                };
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
                return {
                    id: DialogErrorMessages.INVALID_OPTION,
                    defaultMessage: 'Must be a valid option',
                };
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
                        return {
                            id: DialogErrorMessages.INVALID_OPTION,
                            defaultMessage: 'Must be a valid option',
                        };
                    }
                }
            } else {
                // Single select validation
                const valueToCheck = isAppSelectOption(value) ? value.value : value;
                if (!options.some((e) => e.value === valueToCheck)) {
                    return {
                        id: DialogErrorMessages.INVALID_OPTION,
                        defaultMessage: 'Must be a valid option',
                    };
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
