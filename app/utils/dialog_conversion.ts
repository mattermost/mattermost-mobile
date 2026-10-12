// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Dialog conversion utilities for Interactive Dialog to AppsForm migration
// Based on webapp dialog_conversion.ts from PR #31821

import {AppFieldTypes} from '@constants/apps';

import {isAppSelectOption, mapDialogTypeToAppFieldType, DialogElementTypes, DialogTextSubtypes} from './dialog_utils';

export interface ConversionContext {
    elements: DialogElement[];
}

export interface ConversionResult {
    submission: {[key: string]: string | number | boolean};
    errors: string[];
}

/**
 * Flatten a tree of items, expanding collapsible containers into their children.
 * Shared by flattenDialogElements (DialogElement) and flattenAppFields (AppField)
 * so the two stay in sync, and mirrors the webapp helper of the same name.
 */
export function flattenCollapsible<T>(
    items: T[],
    isCollapsible: (item: T) => boolean,
    getChildren: (item: T) => T[] | undefined,
): T[] {
    return items.flatMap((item) => (isCollapsible(item) ? flattenCollapsible(getChildren(item) || [], isCollapsible, getChildren) : [item]));
}

/**
 * Flatten elements, expanding collapsible sections into their child elements.
 * Collapsible containers hold no value, so every path that looks up a value by
 * field name walks the flattened list instead of the top-level one.
 */
export function flattenDialogElements(elements: DialogElement[] = []): DialogElement[] {
    return flattenCollapsible(
        elements,
        (element) => element.type === DialogElementTypes.COLLAPSIBLE,
        (element) => element.collapsible_config?.elements,
    );
}

/**
 * Flatten AppFields, expanding collapsible sections into their leaf fields.
 */
export function flattenAppFields(fields: AppField[] = []): AppField[] {
    return flattenCollapsible(
        fields,
        (field) => field.type === AppFieldTypes.COLLAPSIBLE,
        (field) => field.collapsible_config?.fields,
    );
}

/**
 * Collects file IDs from FILE-type dialog elements in a converted submission.
 * Shared by the single-step (adapter) and multi-step (dialog_router) submit paths
 * so uploaded file IDs aren't dropped on either. FILE values are comma-joined IDs.
 */
export function collectFileIds(submission: {[key: string]: string}, elements: DialogElement[] = []): string[] {
    const fileIds: string[] = [];
    flattenDialogElements(elements).forEach((element) => {
        if (element.type === 'file' && submission[element.name]) {
            fileIds.push(...String(submission[element.name]).split(',').map((id) => id.trim()).filter(Boolean));
        }
    });
    return [...new Set(fileIds)];
}

/** Merge FILE field values from a step into accumulated per-field state (replace, not append). */
export function mergeFileFieldValues(
    accumulated: Record<string, string>,
    submission: Record<string, string>,
    elements: DialogElement[] = [],
): Record<string, string> {
    const merged = {...accumulated};
    flattenDialogElements(elements).forEach((element) => {
        if (element.type === 'file' && Object.prototype.hasOwnProperty.call(submission, element.name)) {
            merged[element.name] = submission[element.name];
        }
    });
    return merged;
}

/** Flatten per-field comma-joined FILE values into a deduplicated file_ids array. */
export function flattenFileFieldValues(byField: Record<string, string>): string[] {
    const fileIds: string[] = [];
    Object.values(byField).forEach((value) => {
        fileIds.push(...String(value).split(',').map((id) => id.trim()).filter(Boolean));
    });
    return [...new Set(fileIds)];
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

    // Collapsible containers never hold a value, so resolve every submitted
    // name against their children as well.
    const leafElements = flattenDialogElements(elements);

    // Convert each form value back to dialog submission format
    valueKeys.forEach((fieldName) => {
        const value = values[fieldName];
        const element = leafElements.find((e) => e.name === fieldName);

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

            case DialogElementTypes.FILE:
                // File elements store uploaded file IDs as a comma-separated string
                submission[fieldName] = String(value || '');
                break;

            default:
                submission[fieldName] = String(value || '');
        }
    });

    return {submission, errors};
}

/**
 * Convert a list of elements. Separate from the single-element converter so a
 * collapsible's children go through exactly the same path as the top level.
 */
function convertDialogElements(elements?: DialogElement[]): AppField[] {
    return (elements || []).map(convertDialogElementToAppField);
}

/**
 * Converts DialogElement to AppField format
 * Used when converting dialog config to AppForm
 */
export function convertDialogElementToAppField(element: DialogElement): AppField {
    // A collapsible is a container: convert its children recursively and give
    // the section itself no value, name lookup or validation of its own.
    if (element.type === DialogElementTypes.COLLAPSIBLE) {
        return {
            name: element.name,
            type: AppFieldTypes.COLLAPSIBLE,
            label: element.display_name,
            position: 0,
            collapsible_config: {
                fields: convertDialogElements(element.collapsible_config?.elements),
                expanded: !element.collapsible_config?.collapsed,
                bordered: !element.collapsible_config?.borderless,
            },
        };
    }

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
        if (element.type !== DialogElementTypes.TEXTAREA && element.subtype) {
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

    if (element.type === DialogElementTypes.FILE && element.allow_multiple) {
        appField.allow_multiple = true;
    }

    if (element.default) {
        appField.value = element.default;
    }

    if (element.placeholder) {
        appField.hint = element.placeholder;
    }

    // Preserve datetime configuration
    if (element.type === DialogElementTypes.DATE || element.type === DialogElementTypes.DATETIME) {
        appField.min_date = element.min_date;
        appField.max_date = element.max_date;
        appField.time_interval = element.time_interval;
        appField.datetime_config = element.datetime_config;
    }

    // Field refresh should be controlled by the server-side dialog configuration
    // The server should specify which fields trigger form refresh
    appField.refresh = element.refresh;

    return appField;
}

/**
 * Converts InteractiveDialogConfig to AppForm
 */
export function convertDialogToAppForm(config: InteractiveDialogConfig): AppForm {
    const convertedFields = convertDialogElements(config.dialog.elements).map((field, index) => ({
        ...field,
        position: index,
    }));

    // Set source only if source_url is provided or if any fields have refresh enabled (matching webapp behavior).
    // A refresh field nested in a collapsible counts too, so check the flattened list.
    const hasRefreshFields = flattenAppFields(convertedFields).some((field) => field.refresh === true);
    const sourceUrl = config.dialog.source_url;

    const form: AppForm = {
        title: config.dialog.title,
        header: config.dialog.introduction_text || undefined,
        fields: convertedFields,
        submit_buttons: undefined,

        // Pass through submit label from dialog config
        submit_label: config.dialog.submit_label || undefined,

        // Set source if sourceUrl is provided or if any fields have refresh enabled (matching webapp behavior)
        source: ((sourceUrl && sourceUrl.trim()) || hasRefreshFields) ? {
            path: sourceUrl || '/dialog/refresh',
            expand: {},
        } : undefined,
        submit: {
            path: '/dialog/submit',
            expand: {},
        },
    };

    return form;
}
