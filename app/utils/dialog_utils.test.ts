// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppFieldTypes} from '@constants/apps';

import {
    isAppSelectOption,
    DialogDataSources,
    DialogElementTypes,
    DialogTextSubtypes,
    DialogErrorMessages,
    mapDialogTypeToAppFieldType,
    mapAppFieldTypeToDialogType,
    getDataSourceForAppFieldType,
    createDialogElement,
    createAppField,
    supportsOptions,
    supportsDataSource,
} from './dialog_utils';

describe('dialog_utils', () => {
    describe('isAppSelectOption', () => {
        it('should return true for valid AppSelectOption objects', () => {
            expect(isAppSelectOption({label: 'Test', value: 'test'})).toBe(true);
            expect(isAppSelectOption({value: 'test'})).toBe(true);
            expect(isAppSelectOption({value: 'test', label: 'Test', description: 'desc'})).toBe(true);
        });

        it('should return false for non-objects', () => {
            expect(isAppSelectOption('string')).toBe(false);
            expect(isAppSelectOption(123)).toBe(false);
            expect(isAppSelectOption(true)).toBe(false);
            expect(isAppSelectOption(null)).toBe(false);
            expect(isAppSelectOption(undefined)).toBe(false);
        });

        it('should return false for objects without value property', () => {
            expect(isAppSelectOption({})).toBe(false);
            expect(isAppSelectOption({label: 'Test'})).toBe(false);
            expect(isAppSelectOption({text: 'Test'})).toBe(false);
        });
    });

    describe('mapDialogTypeToAppFieldType', () => {
        it('should map text and textarea types correctly', () => {
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.TEXT)).toBe('text');
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.TEXTAREA)).toBe('text');
        });

        it('should map select types based on data source', () => {
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.SELECT)).toBe('static_select');
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.SELECT, DialogDataSources.USERS)).toBe('user');
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.SELECT, DialogDataSources.CHANNELS)).toBe('channel');
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.SELECT, 'unknown')).toBe('static_select');
        });

        it('should map radio and bool types correctly', () => {
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.RADIO)).toBe('radio');
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.BOOL)).toBe('bool');
        });

        it('should default to text for unknown types', () => {
            expect(mapDialogTypeToAppFieldType('unknown_type' as any)).toBe('text');
        });
    });

    describe('mapAppFieldTypeToDialogType', () => {
        it('should map text types correctly', () => {
            expect(mapAppFieldTypeToDialogType('text')).toBe(DialogElementTypes.TEXT);
        });

        it('should map select types to select', () => {
            expect(mapAppFieldTypeToDialogType('static_select')).toBe(DialogElementTypes.SELECT);
            expect(mapAppFieldTypeToDialogType('dynamic_select')).toBe(DialogElementTypes.SELECT);
            expect(mapAppFieldTypeToDialogType('user')).toBe(DialogElementTypes.SELECT);
            expect(mapAppFieldTypeToDialogType('channel')).toBe(DialogElementTypes.SELECT);
        });

        it('should map radio and bool types correctly', () => {
            expect(mapAppFieldTypeToDialogType('radio')).toBe(DialogElementTypes.RADIO);
            expect(mapAppFieldTypeToDialogType('bool')).toBe(DialogElementTypes.BOOL);
        });

        it('should default to text for unknown types', () => {
            expect(mapAppFieldTypeToDialogType('unknown_type' as any)).toBe(DialogElementTypes.TEXT);
        });
    });

    describe('getDataSourceForAppFieldType', () => {
        it('should return correct data sources for user and channel types', () => {
            expect(getDataSourceForAppFieldType('user')).toBe(DialogDataSources.USERS);
            expect(getDataSourceForAppFieldType('channel')).toBe(DialogDataSources.CHANNELS);
        });

        it('should return undefined for types without data sources', () => {
            expect(getDataSourceForAppFieldType('text')).toBeUndefined();
            expect(getDataSourceForAppFieldType('static_select')).toBeUndefined();
            expect(getDataSourceForAppFieldType('radio')).toBeUndefined();
            expect(getDataSourceForAppFieldType('bool')).toBeUndefined();
        });

        it('should return correct data source for dynamic_select', () => {
            expect(getDataSourceForAppFieldType('dynamic_select')).toBe('dynamic');
        });
    });

    describe('createDialogElement', () => {
        it('should create dialog element with defaults', () => {
            const result = createDialogElement('test_field', DialogElementTypes.TEXT);

            expect(result).toEqual({
                name: 'test_field',
                type: DialogElementTypes.TEXT,
                optional: true,
                display_name: 'test_field',
            });
        });

        it('should merge provided options', () => {
            const options = {
                display_name: 'Custom Display Name',
                help_text: 'Custom help',
                optional: false,
                default: 'custom default',
            };

            const result = createDialogElement('test_field', DialogElementTypes.TEXT, options);

            expect(result).toEqual({
                name: 'test_field',
                type: DialogElementTypes.TEXT,
                optional: false,
                display_name: 'Custom Display Name',
                help_text: 'Custom help',
                default: 'custom default',
            });
        });

        it('should work with all dialog element types', () => {
            const textElement = createDialogElement('text', DialogElementTypes.TEXT);
            const selectElement = createDialogElement('select', DialogElementTypes.SELECT);
            const radioElement = createDialogElement('radio', DialogElementTypes.RADIO);
            const boolElement = createDialogElement('bool', DialogElementTypes.BOOL);
            const textareaElement = createDialogElement('textarea', DialogElementTypes.TEXTAREA);

            expect(textElement.type).toBe(DialogElementTypes.TEXT);
            expect(selectElement.type).toBe(DialogElementTypes.SELECT);
            expect(radioElement.type).toBe(DialogElementTypes.RADIO);
            expect(boolElement.type).toBe(DialogElementTypes.BOOL);
            expect(textareaElement.type).toBe(DialogElementTypes.TEXTAREA);
        });
    });

    describe('createAppField', () => {
        it('should create app field with defaults', () => {
            const result = createAppField('test_field', 'text');

            expect(result).toEqual({
                name: 'test_field',
                type: 'text',
                is_required: false,
                label: 'test_field',
                position: 0,
            });
        });

        it('should merge provided options', () => {
            const options = {
                label: 'Custom Label',
                description: 'Custom description',
                is_required: true,
                position: 5,
                value: 'custom value',
            };

            const result = createAppField('test_field', 'text', options);

            expect(result).toEqual({
                name: 'test_field',
                type: 'text',
                is_required: true,
                label: 'Custom Label',
                description: 'Custom description',
                position: 5,
                value: 'custom value',
            });
        });

        it('should work with all app field types', () => {
            const textField = createAppField('text', AppFieldTypes.TEXT);
            const selectField = createAppField('select', AppFieldTypes.STATIC_SELECT);
            const radioField = createAppField('radio', AppFieldTypes.RADIO);
            const boolField = createAppField('bool', AppFieldTypes.BOOL);
            const userField = createAppField('user', AppFieldTypes.USER);
            const channelField = createAppField('channel', AppFieldTypes.CHANNEL);

            expect(textField.type).toBe(AppFieldTypes.TEXT);
            expect(selectField.type).toBe(AppFieldTypes.STATIC_SELECT);
            expect(radioField.type).toBe(AppFieldTypes.RADIO);
            expect(boolField.type).toBe(AppFieldTypes.BOOL);
            expect(userField.type).toBe(AppFieldTypes.USER);
            expect(channelField.type).toBe(AppFieldTypes.CHANNEL);
        });
    });

    describe('supportsOptions', () => {
        it('should return true for dialog types that support options', () => {
            expect(supportsOptions(DialogElementTypes.SELECT)).toBe(true);
            expect(supportsOptions(DialogElementTypes.RADIO)).toBe(true);
        });

        it('should return false for dialog types that do not support options', () => {
            expect(supportsOptions(DialogElementTypes.TEXT)).toBe(false);
            expect(supportsOptions(DialogElementTypes.TEXTAREA)).toBe(false);
            expect(supportsOptions(DialogElementTypes.BOOL)).toBe(false);
        });

        it('should return true for app field types that support options', () => {
            expect(supportsOptions(AppFieldTypes.STATIC_SELECT)).toBe(true);
            expect(supportsOptions(AppFieldTypes.DYNAMIC_SELECT)).toBe(true);
            expect(supportsOptions(AppFieldTypes.RADIO)).toBe(true);
            expect(supportsOptions(AppFieldTypes.USER)).toBe(true);
            expect(supportsOptions(AppFieldTypes.CHANNEL)).toBe(true);
        });

        it('should return false for app field types that do not support options', () => {
            expect(supportsOptions(AppFieldTypes.TEXT)).toBe(false);
            expect(supportsOptions(AppFieldTypes.BOOL)).toBe(false);
            expect(supportsOptions(AppFieldTypes.MARKDOWN)).toBe(false);
        });
    });

    describe('supportsDataSource', () => {
        it('should return true only for select dialog elements', () => {
            expect(supportsDataSource(DialogElementTypes.SELECT)).toBe(true);
        });

        it('should return false for non-select dialog elements', () => {
            expect(supportsDataSource(DialogElementTypes.TEXT)).toBe(false);
            expect(supportsDataSource(DialogElementTypes.TEXTAREA)).toBe(false);
            expect(supportsDataSource(DialogElementTypes.RADIO)).toBe(false);
            expect(supportsDataSource(DialogElementTypes.BOOL)).toBe(false);
        });
    });

    describe('constants consistency', () => {
        it('should have consistent dialog data sources', () => {
            expect(DialogDataSources.USERS).toBe('users');
            expect(DialogDataSources.CHANNELS).toBe('channels');
        });

        it('should have consistent dialog element types', () => {
            expect(DialogElementTypes.TEXT).toBe('text');
            expect(DialogElementTypes.TEXTAREA).toBe('textarea');
            expect(DialogElementTypes.SELECT).toBe('select');
            expect(DialogElementTypes.RADIO).toBe('radio');
            expect(DialogElementTypes.BOOL).toBe('bool');
        });

        it('should have consistent dialog text subtypes', () => {
            expect(DialogTextSubtypes.NUMBER).toBe('number');
            expect(DialogTextSubtypes.EMAIL).toBe('email');
            expect(DialogTextSubtypes.PASSWORD).toBe('password');
            expect(DialogTextSubtypes.URL).toBe('url');
            expect(DialogTextSubtypes.TEXTAREA).toBe('textarea');
        });

        it('should have dialog error message constants', () => {
            expect(DialogErrorMessages.REQUIRED).toBe('interactive_dialog.error.required');
            expect(DialogErrorMessages.TOO_SHORT).toBe('interactive_dialog.error.too_short');
            expect(DialogErrorMessages.BAD_EMAIL).toBe('interactive_dialog.error.bad_email');
            expect(DialogErrorMessages.BAD_NUMBER).toBe('interactive_dialog.error.bad_number');
            expect(DialogErrorMessages.BAD_URL).toBe('interactive_dialog.error.bad_url');
            expect(DialogErrorMessages.INVALID_OPTION).toBe('interactive_dialog.error.invalid_option');
            expect(DialogErrorMessages.SUBMISSION_FAILED).toBe('interactive_dialog.submission_failed');
            expect(DialogErrorMessages.SUBMISSION_FAILED_NETWORK).toBe('interactive_dialog.submission_failed_network');
            expect(DialogErrorMessages.SUBMISSION_FAILED_VALIDATION).toBe('interactive_dialog.submission_failed_validation');
            expect(DialogErrorMessages.SUBMISSION_FAILED_WITH_DETAILS).toBe('interactive_dialog.submission_failed_with_details');
        });
    });
});
