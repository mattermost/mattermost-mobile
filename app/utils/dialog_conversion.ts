// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Dialog conversion utilities for Interactive Dialog to AppsForm migration
// Based on webapp dialog_conversion.ts from PR #31821

import {logDebug} from '@utils/log';

import {isAppSelectOption, mapDialogTypeToAppFieldType, DialogElementTypes, DialogTextSubtypes} from './dialog_utils';

export interface ConversionContext {
    elements: DialogElement[];
}

export interface ConversionResult {
    submission: {[key: string]: string | number | boolean};
    errors: string[];
}

/**
 * Converts AppForm values back to legacy DialogSubmission format
 * Used when submitting converted dialogs through legacy endpoints
 */
export function convertAppFormValuesToDialogSubmission(
    values: AppFormValues,
    elements: DialogElement[],
): ConversionResult {
    const submission: {[key: string]: string | number | boolean} = {};
    const errors: string[] = [];

    // Early return if no values to process
    const valueKeys = Object.keys(values);
    if (valueKeys.length === 0) {
        return {submission, errors};
    }

    // Convert each form value back to dialog submission format
    valueKeys.forEach((fieldName) => {
        const value = values[fieldName];
        const element = elements.find((e) => e.name === fieldName);

        if (!element) {
            errors.push(`Field ${fieldName} not found in dialog elements`);
            return;
        }

        // Convert based on field type
        switch (element.type) {
            case DialogElementTypes.TEXT:
            case DialogElementTypes.TEXTAREA:
                if (element.subtype === DialogTextSubtypes.NUMBER) {
                    // Handle empty number fields like legacy dialog - omit from submission
                    if (value === '' || value === null || value === undefined) {
                        break; // Don't include in submission
                    }
                    const numValue = Number(value);
                    submission[fieldName] = isNaN(numValue) ? String(value) : numValue;
                } else {
                    submission[fieldName] = String(value || '');
                }
                break;

            case DialogElementTypes.RADIO:
            case DialogElementTypes.SELECT:
                // Handle multiselect arrays for SELECT fields only
                if (element.type === DialogElementTypes.SELECT && element.multiselect && Array.isArray(value)) {
                    // For multiselect, extract values from AppSelectOption array and join with commas
                    const extractedValues = value.map((option) => (
                        isAppSelectOption(option) ? (option.value || '') : String(option || '')
                    )).filter((v) => v !== '');
                    submission[fieldName] = extractedValues.join(',');
                } else if (isAppSelectOption(value)) {
                    // Single AppSelectOption object
                    submission[fieldName] = String(value.value || '');
                } else {
                    // Single string value
                    submission[fieldName] = String(value || '');
                }
                break;

            case DialogElementTypes.BOOL:
                submission[fieldName] = Boolean(value);
                break;

            default:
                submission[fieldName] = String(value || '');
        }
    });

    return {submission, errors};
}

/**
 * Converts DialogElement to AppField format
 * Used when converting dialog config to AppForm
 */
export function convertDialogElementToAppField(element: DialogElement): AppField {
    const appField: AppField = {
        name: element.name,
        type: mapDialogTypeToAppFieldType(element.type, element.data_source),
        is_required: !element.optional,
        label: element.display_name,
        description: element.help_text,
        position: 0, // Will be set by caller based on order
    };

    // Add type-specific properties
    if (element.type === DialogElementTypes.TEXT || element.type === DialogElementTypes.TEXTAREA) {
        appField.max_length = element.max_length;
        appField.min_length = element.min_length;
        if (element.type !== DialogElementTypes.TEXTAREA) {
            appField.subtype = element.subtype;
        }
    }

    if (element.type === DialogElementTypes.RADIO || element.type === DialogElementTypes.SELECT) {
        appField.options = element.options?.map((option) => ({
            label: option.text,
            value: option.value,
        }));

        // Add multiselect support for select fields
        if (element.type === DialogElementTypes.SELECT && element.multiselect) {
            appField.multiselect = element.multiselect;
        }
    }

    if (element.default) {
        appField.value = element.default;
    }

    if (element.placeholder) {
        appField.hint = element.placeholder;
    }

    // Field refresh should be controlled by the server-side dialog configuration
    // The server should specify which fields trigger form refresh
    if (element.refresh === true) {
        logDebug('Dialog conversion: Field has refresh enabled', {
            fieldName: element.name,
            fieldType: element.type,
        });
        appField.refresh = true;
    }

    logDebug('Dialog conversion: Converted field', {
        fieldName: element.name,
        fieldType: element.type,
        hasRefresh: Boolean(appField.refresh),
    });

    return appField;
}

/**
 * Converts InteractiveDialogConfig to AppForm
 */
export function convertDialogToAppForm(config: InteractiveDialogConfig): AppForm {
    const form: AppForm = {
        title: config.dialog.title,
        header: config.dialog.introduction_text || undefined,
        fields: config.dialog.elements?.map((element, index) => ({
            ...convertDialogElementToAppField(element),
            position: index,
        })) || [],
        submit_buttons: undefined,
        
        // Pass through submit label from dialog config
        submit_label: config.dialog.submit_label || undefined,

        // Set source to the dialog URL for field refresh support
        source: config.url ? {
            path: config.url,
            expand: {},
        } : undefined,
        submit: {
            path: '/dialog/submit',
            expand: {},
        },
    };

    return form;
}
