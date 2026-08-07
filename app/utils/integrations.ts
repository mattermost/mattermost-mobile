// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {defineMessages, type IntlShape} from 'react-intl';

import {resolveRelativeDate} from './date_utils';
import {isAppSelectOption, DialogElementTypes, DialogTextSubtypes} from './dialog_utils';

import type {KeyboardTypeOptions} from 'react-native';

const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `YYYY-MM-DDTHH:mm:ssZ` or with a UTC offset. Fractional seconds are accepted because the
 * mobile date/time picker serializes with `Moment.toISOString()`.
 */
const DATETIME_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const messages = defineMessages({
    required: {
        id: 'interactive_dialog.error.required',
        defaultMessage: 'This field is required.',
    },
    tooShort: {
        id: 'interactive_dialog.error.too_short',
        defaultMessage: 'Minimum input length is {minLength}.',
    },
    tooLong: {
        id: 'interactive_dialog.error.too_long',
        defaultMessage: 'Maximum input length is {maxLength}.',
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
    invalidFile: {
        id: 'interactive_dialog.error.invalid_file',
        defaultMessage: 'Invalid file upload.',
    },
    badFormat: {
        id: 'interactive_dialog.error.bad_format',
        defaultMessage: 'Invalid date format',
    },
    badDateFormat: {
        id: 'interactive_dialog.error.bad_date_format',
        defaultMessage: 'Date field must be in YYYY-MM-DD format',
    },
    badDatetimeFormat: {
        id: 'interactive_dialog.error.bad_datetime_format',
        defaultMessage: 'DateTime field must be in YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss+HH:MM format',
    },
    beforeMinDate: {
        id: 'interactive_dialog.error.before_min_date',
        defaultMessage: 'Selected time is before the minimum allowed date.',
    },
    afterMaxDate: {
        id: 'interactive_dialog.error.after_max_date',
        defaultMessage: 'Selected time is after the maximum allowed date.',
    },
});

/** Field error descriptor, formatted by the caller so validation stays intl-free. */
export type DialogFieldError = {
    id: string;
    defaultMessage: string;
    values?: Record<string, string | number>;
};

/**
 * Formats a DialogFieldError with statically referenced defineMessages entries.
 */
export function formatDialogFieldError(intl: IntlShape, error: DialogFieldError): string {
    switch (error.id) {
        case messages.required.id:
            return intl.formatMessage(messages.required, error.values);
        case messages.tooShort.id:
            return intl.formatMessage(messages.tooShort, error.values);
        case messages.tooLong.id:
            return intl.formatMessage(messages.tooLong, error.values);
        case messages.badEmail.id:
            return intl.formatMessage(messages.badEmail, error.values);
        case messages.badNumber.id:
            return intl.formatMessage(messages.badNumber, error.values);
        case messages.badUrl.id:
            return intl.formatMessage(messages.badUrl, error.values);
        case messages.invalidOption.id:
            return intl.formatMessage(messages.invalidOption, error.values);
        case messages.invalidFile.id:
            return intl.formatMessage(messages.invalidFile, error.values);
        case messages.badFormat.id:
            return intl.formatMessage(messages.badFormat, error.values);
        case messages.badDateFormat.id:
            return intl.formatMessage(messages.badDateFormat, error.values);
        case messages.badDatetimeFormat.id:
            return intl.formatMessage(messages.badDatetimeFormat, error.values);
        case messages.beforeMinDate.id:
            return intl.formatMessage(messages.beforeMinDate, error.values);
        case messages.afterMaxDate.id:
            return intl.formatMessage(messages.afterMaxDate, error.values);
        default:
            return error.defaultMessage;
    }
}

/** Shared validation message descriptors for mm_blocks / dialog field checks. */
export const dialogFieldErrorMessages = messages;

function resolveBoundToDate(value: string): moment.Moment | null {
    const resolved = moment(resolveRelativeDate(value), moment.ISO_8601);
    return resolved.isValid() ? resolved : null;
}

/** Validates a date/datetime field value for storage format and min/max range constraints. */
export function checkDateTimeFieldValue(
    value: string,
    fieldType: 'date' | 'datetime',
    bounds?: {
        min_date?: string;
        max_date?: string;
        datetime_config?: {min_date?: string; max_date?: string};
    },
): DialogFieldError | null {
    const parsedDate = moment(value, moment.ISO_8601);
    if (!parsedDate.isValid()) {
        return messages.badFormat;
    }

    if (fieldType === 'date') {
        if (!DATE_FORMAT_PATTERN.test(value)) {
            return messages.badDateFormat;
        }
    } else if (!DATETIME_FORMAT_PATTERN.test(value)) {
        return messages.badDatetimeFormat;
    }

    const effectiveMinDate = bounds?.datetime_config?.min_date ?? bounds?.min_date;
    const effectiveMaxDate = bounds?.datetime_config?.max_date ?? bounds?.max_date;
    if (effectiveMinDate) {
        const minDate = resolveBoundToDate(effectiveMinDate);
        if (minDate && parsedDate.isBefore(minDate)) {
            return messages.beforeMinDate;
        }
    }
    if (effectiveMaxDate) {
        const maxDate = resolveBoundToDate(effectiveMaxDate);
        if (maxDate && parsedDate.isAfter(maxDate)) {
            return messages.afterMaxDate;
        }
    }

    return null;
}

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
    } else if (type === DialogElementTypes.DATE || type === DialogElementTypes.DATETIME) {
        // Required date/datetime fields must have a value
        if (!elem.optional && (value == null || value === '')) {
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
