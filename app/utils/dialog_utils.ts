// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppFieldTypes} from '@constants/apps';

// Shared utilities for dialog and form handling

/**
 * Type guard to check if a value is an AppSelectOption
 */
export function isAppSelectOption(value: any): value is AppSelectOption {
    return typeof value === 'object' && value !== null && 'value' in value;
}

/**
 * Dialog data source constants
 */
export const DialogDataSources = {
    USERS: 'users',
    CHANNELS: 'channels',
    DYNAMIC: 'dynamic',
} as const;

/**
 * Dialog element types
 */
export const DialogElementTypes = {
    TEXT: 'text' as const,
    TEXTAREA: 'textarea' as const,
    SELECT: 'select' as const,
    RADIO: 'radio' as const,
    BOOL: 'bool' as const,
    FILE: 'file' as const,
    DATE: 'date' as const,
    DATETIME: 'datetime' as const,
    ACTION_BUTTON: 'action_button' as const,
    COLLAPSIBLE: 'collapsible' as const,
} as const;

/**
 * Dialog text subtypes
 */
export const DialogTextSubtypes = {
    NUMBER: 'number' as const,
    EMAIL: 'email' as const,
    PASSWORD: 'password' as const,
    URL: 'url' as const,
    TEXTAREA: 'textarea' as const,
} as const;

/**
 * Maps legacy dialog element types to modern AppField types
 */
export function mapDialogTypeToAppFieldType(dialogType: InteractiveDialogElementType, dataSource?: string): AppFieldType {
    switch (dialogType) {
        case DialogElementTypes.TEXT:
        case DialogElementTypes.TEXTAREA:
            return 'text';
        case DialogElementTypes.SELECT:
            // Handle user and channel selects based on data_source
            if (dataSource === DialogDataSources.USERS) {
                return 'user';
            }
            if (dataSource === DialogDataSources.CHANNELS) {
                return 'channel';
            }
            if (dataSource === DialogDataSources.DYNAMIC) {
                return 'dynamic_select';
            }
            return 'static_select';
        case DialogElementTypes.RADIO:
            return 'radio';
        case DialogElementTypes.BOOL:
            return 'bool';
        case DialogElementTypes.FILE:
            return 'file';
        case DialogElementTypes.DATE:
            return 'date';
        case DialogElementTypes.DATETIME:
            return 'datetime';
        case DialogElementTypes.ACTION_BUTTON:
            return 'action_button';
        default:
            return 'text';
    }
}

/**
 * Maps AppField types back to legacy dialog element types
 */
export function mapAppFieldTypeToDialogType(appFieldType: AppFieldType): InteractiveDialogElementType {
    switch (appFieldType) {
        case 'text':
            return DialogElementTypes.TEXT;
        case 'static_select':
        case 'dynamic_select':
        case 'user':
        case 'channel':
            return DialogElementTypes.SELECT;
        case 'radio':
            return DialogElementTypes.RADIO;
        case 'bool':
            return DialogElementTypes.BOOL;
        case 'file':
            return DialogElementTypes.FILE;
        case 'date':
            return DialogElementTypes.DATE;
        case 'datetime':
            return DialogElementTypes.DATETIME;
        case 'action_button':
            return DialogElementTypes.ACTION_BUTTON;
        default:
            return DialogElementTypes.TEXT;
    }
}

/**
 * Maps AppField type back to data_source for validation
 */
export function getDataSourceForAppFieldType(appFieldType: AppFieldType): string | undefined {
    switch (appFieldType) {
        case 'user':
            return DialogDataSources.USERS;
        case 'channel':
            return DialogDataSources.CHANNELS;
        case 'dynamic_select':
            return DialogDataSources.DYNAMIC;
        default:
            return undefined;
    }
}

/**
 * Helper to create a DialogElement with proper defaults
 */
export function createDialogElement(
    name: string,
    type: InteractiveDialogElementType,
    options?: Partial<DialogElement>,
): DialogElement {
    return {
        name,
        type,
        optional: true,
        display_name: name,
        ...options,
    } as DialogElement;
}

/**
 * Helper to create an AppField with proper defaults
 */
export function createAppField(
    name: string,
    type: AppFieldType,
    options?: Partial<AppField>,
): AppField {
    return {
        name,
        type,
        is_required: false,
        label: name,
        position: 0,
        ...options,
    };
}

/**
 * Validates if a field type supports options
 */
export function supportsOptions(fieldType: InteractiveDialogElementType | AppFieldType): boolean {
    const supportedTypes = [
        DialogElementTypes.SELECT,
        DialogElementTypes.RADIO,
        'static_select',
        'dynamic_select',
        'radio',
        'user',
        'channel',
    ];
    return supportedTypes.includes(fieldType as any);
}

/**
 * Validates if a field type supports data_source
 */
export function supportsDataSource(fieldType: InteractiveDialogElementType): boolean {
    return fieldType === DialogElementTypes.SELECT;
}

// Returns the value the user entered for a field, adapted to the refreshed version of
// that field, or undefined when it no longer fits: the field changed type, or the
// options the user picked were removed.
export function keepUserValue(field: AppField, previousField: AppField | undefined, value: AppFormValue): AppFormValue | undefined {
    if (previousField && previousField.type !== field.type) {
        return undefined;
    }

    if (field.type !== AppFieldTypes.STATIC_SELECT && field.type !== AppFieldTypes.RADIO) {
        return value;
    }

    const optionValues = new Set((field.options || []).map((option) => option.value));
    const hasOption = (v: string | AppSelectOption) => optionValues.has(typeof v === 'string' ? v : v.value);

    if (Array.isArray(value)) {
        return value.filter(hasOption);
    }
    if (typeof value === 'string' || (value && typeof value === 'object')) {
        return hasOption(value) ? value : undefined;
    }
    return value;
}

// Initial values of the refreshed fields, with what the user entered re-applied where it
// still fits.
export function mergeUserValues(fields: AppField[] | undefined, initialValues: AppFormValues, previousFields: Map<string, AppField>, userValues: AppFormValues) {
    const values = {...initialValues};
    fields?.forEach((field) => {
        if (!field.name || !(field.name in userValues) || field.type === AppFieldTypes.ACTION_BUTTON) {
            return;
        }
        const kept = keepUserValue(field, previousFields.get(field.name), userValues[field.name]);
        if (kept !== undefined) {
            values[field.name] = kept;
        }
    });
    return values;
}

/**
 * Recursively flattens a list by expanding collapsible containers into their children.
 */
export function flattenCollapsible<T>(
    items: T[],
    isCollapsible: (item: T) => boolean,
    getChildren: (item: T) => T[] | undefined,
): T[] {
    return items.flatMap((item) =>
        (isCollapsible(item)? flattenCollapsible(getChildren(item) || [], isCollapsible, getChildren): [item]),
    );
}

/**
 * Returns only the leaf (non-collapsible) elements from a dialog element tree.
 */
export function flattenDialogElements(elements: DialogElement[]): DialogElement[] {
    return flattenCollapsible(
        elements,
        (el) => el.type === DialogElementTypes.COLLAPSIBLE,
        (el) => el.collapsible_config?.elements,
    );
}

/**
 * Returns only the leaf (non-collapsible) fields from an AppField tree.
 */
export function flattenAppFields(fields: AppField[]): AppField[] {
    return flattenCollapsible(
        fields,
        (f) => f.type === 'collapsible',
        (f) => f.collapsible_config?.fields,
    );
}
