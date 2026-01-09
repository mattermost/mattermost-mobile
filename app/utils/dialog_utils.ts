// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
 * Dialog validation error message IDs
 */
export const DialogErrorMessages = {
    REQUIRED: 'interactive_dialog.error.required',
    TOO_SHORT: 'interactive_dialog.error.too_short',
    BAD_EMAIL: 'interactive_dialog.error.bad_email',
    BAD_NUMBER: 'interactive_dialog.error.bad_number',
    BAD_URL: 'interactive_dialog.error.bad_url',
    INVALID_OPTION: 'interactive_dialog.error.invalid_option',
    SUBMISSION_FAILED: 'interactive_dialog.submission_failed',
    SUBMISSION_FAILED_NETWORK: 'interactive_dialog.submission_failed_network',
    SUBMISSION_FAILED_VALIDATION: 'interactive_dialog.submission_failed_validation',
    SUBMISSION_FAILED_WITH_DETAILS: 'interactive_dialog.submission_failed_with_details',
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
