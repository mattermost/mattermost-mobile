// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {checkDialogElementForError, checkIfErrorsMatchElements, selectKeyboardType} from './integrations';

describe('checkDialogElementForError', () => {
    test('returns required error for empty required field', () => {
        const elem: DialogElement = {
            name: 'field1',
            type: 'text',
            optional: false,
            display_name: '',
            subtype: 'number',
            default: '',
            placeholder: '',
            help_text: '',
            min_length: 0,
            max_length: 0,
            data_source: '',
            options: [],
        };
        const result = checkDialogElementForError(elem, '');
        expect(result).toEqual({
            id: 'interactive_dialog.error.required',
            defaultMessage: 'This field is required.',
        });
    });

    test('returns too short error for text shorter than min_length', () => {
        const elem: DialogElement = {
            name: 'field1',
            type: 'text',
            min_length: 5,
            display_name: '',
            subtype: 'number',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            max_length: 0,
            data_source: '',
            options: [],
        };
        const result = checkDialogElementForError(elem, '123');
        expect(result).toEqual({
            id: 'interactive_dialog.error.too_short',
            defaultMessage: 'Minimum input length is {minLength}.',
            values: {minLength: 5},
        });
    });

    test('returns bad email error for invalid email', () => {
        const elem: DialogElement = {
            name: 'field1',
            type: 'text',
            subtype: 'email',
            display_name: '',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
            options: [],
        };
        const result = checkDialogElementForError(elem, 'invalidemail');
        expect(result).toEqual({
            id: 'interactive_dialog.error.bad_email',
            defaultMessage: 'Must be a valid email address.',
        });
    });

    test('returns bad number error for invalid number', () => {
        const elem: DialogElement = {
            name: 'field1',
            type: 'text',
            subtype: 'number',
            display_name: '',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
            options: [],
        };
        const result = checkDialogElementForError(elem, 'notanumber');
        expect(result).toEqual({
            id: 'interactive_dialog.error.bad_number',
            defaultMessage: 'Must be a number.',
        });
    });

    test('returns bad URL error for invalid URL', () => {
        const elem: DialogElement = {
            name: 'field1',
            type: 'text',
            subtype: 'url',
            display_name: '',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
            options: [],
        };
        const result = checkDialogElementForError(elem, 'invalidurl');
        expect(result).toEqual({
            id: 'interactive_dialog.error.bad_url',
            defaultMessage: 'URL must include http:// or https://.',
        });
    });

    test('returns invalid option error for invalid radio option', () => {
        const elem: DialogElement = {
            name: 'field1',
            type: 'radio',
            options: [{
                value: 'option1',
                text: '',
            }, {
                value: 'option2',
                text: '',
            }],
            display_name: '',
            subtype: 'number',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
        };
        const result = checkDialogElementForError(elem, 'invalidoption');
        expect(result).toEqual({
            id: 'interactive_dialog.error.invalid_option',
            defaultMessage: 'Must be a valid option',
        });
    });

    test('returns null for valid inputs', () => {
        const elemText: DialogElement = {
            name: 'field1',
            type: 'text',
            min_length: 3,
            display_name: '',
            subtype: 'password',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            max_length: 0,
            data_source: '',
            options: [],
        };
        const elemEmail: DialogElement = {
            name: 'field2',
            type: 'text',
            subtype: 'email',
            display_name: '',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
            options: [],
        };
        const elemNumber: DialogElement = {
            name: 'field3',
            type: 'text',
            subtype: 'number',
            display_name: '',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
            options: [],
        };
        const elemURL: DialogElement = {
            name: 'field4',
            type: 'text',
            subtype: 'url',
            display_name: '',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
            options: [],
        };
        const elemRadio: DialogElement = {
            name: 'field5',
            type: 'radio',
            options: [{
                value: 'option1',
                text: '',
            }, {
                value: 'option2',
                text: '',
            }],
            display_name: '',
            subtype: 'number',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
        };

        expect(checkDialogElementForError(elemText, 'valid')).toBeNull();
        expect(checkDialogElementForError(elemEmail, 'email@example.com')).toBeNull();
        expect(checkDialogElementForError(elemNumber, '123')).toBeNull();
        expect(checkDialogElementForError(elemURL, 'http://example.com')).toBeNull();
        expect(checkDialogElementForError(elemRadio, 'option1')).toBeNull();
    });

    describe('multiselect SELECT validation', () => {
        const multiselectElement: DialogElement = {
            name: 'multiselect_field',
            type: 'select',
            multiselect: true,
            optional: false,
            options: [
                {text: 'Option A', value: 'optA'},
                {text: 'Option B', value: 'optB'},
                {text: 'Option C', value: 'optC'},
            ],
            display_name: 'Multi Select Field',
            placeholder: '',
            help_text: '',
            default: '',
            min_length: 0,
            max_length: 0,
            data_source: '',
        };

        test('should validate multiselect values correctly', () => {
            // Valid multiselect array should pass
            expect(checkDialogElementForError(multiselectElement, ['optA', 'optC'])).toBeNull();
        });

        test('should require at least one selection for required multiselect', () => {
            // Empty array for required field should fail
            expect(checkDialogElementForError(multiselectElement, [])).toEqual({
                id: 'interactive_dialog.error.required',
                defaultMessage: 'This field is required.',
            });
        });

        test('should reject invalid options in multiselect array', () => {
            // Invalid option in array should fail
            expect(checkDialogElementForError(multiselectElement, ['optA', 'invalidOption'])).toEqual({
                id: 'interactive_dialog.error.invalid_option',
                defaultMessage: 'Must be a valid option',
            });
        });

        test('should allow empty arrays for optional multiselect', () => {
            // Optional multiselect can be empty
            const optionalElement = {...multiselectElement, optional: true};
            expect(checkDialogElementForError(optionalElement, [])).toBeNull();
        });

        test('should handle single valid option in multiselect', () => {
            // Single valid option should pass
            expect(checkDialogElementForError(multiselectElement, ['optB'])).toBeNull();
        });

        test('should handle all options selected', () => {
            // All options selected should pass
            expect(checkDialogElementForError(multiselectElement, ['optA', 'optB', 'optC'])).toBeNull();
        });
    });
});

describe('checkIfErrorsMatchElements', () => {
    test('returns false if no dialog elements', () => {
        const errors = {field1: 'error'};
        expect(checkIfErrorsMatchElements(errors)).toBe(false);
    });

    test('returns false if no dialog errprs', () => {
        expect(checkIfErrorsMatchElements()).toBe(false);
    });

    test('returns true if errors match elements', () => {
        const elements: DialogElement[] = [{
            name: 'field1',
            type: 'text',
            display_name: '',
            subtype: 'number',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
            options: [],
        }];
        const errors = {field1: 'error'};
        expect(checkIfErrorsMatchElements(errors, elements)).toBe(true);
    });

    test('returns false if errors do not match elements', () => {
        const elements: DialogElement[] = [{
            name: 'field1',
            type: 'text',
            display_name: '',
            subtype: 'number',
            default: '',
            placeholder: '',
            help_text: '',
            optional: false,
            min_length: 0,
            max_length: 0,
            data_source: '',
            options: [],
        }];
        const errors = {field2: 'error'};
        expect(checkIfErrorsMatchElements(errors, elements)).toBe(false);
    });

    test('returns false if errors and elements are empty', () => {
        expect(checkIfErrorsMatchElements({}, [])).toBe(false);
    });
});

describe('selectKeyboardType', () => {
    test('returns email-address for email subtype', () => {
        expect(selectKeyboardType('email')).toBe('email-address');
    });

    test('returns numeric for number subtype', () => {
        expect(selectKeyboardType('number')).toBe('numeric');
    });

    test('returns phone-pad for tel subtype', () => {
        expect(selectKeyboardType('tel')).toBe('phone-pad');
    });

    test('returns url for url subtype', () => {
        expect(selectKeyboardType('url')).toBe('url');
    });

    test('returns default for undefined subtype', () => {
        expect(selectKeyboardType()).toBe('default');
    });

    test('returns default for unrecognized subtype', () => {
        expect(selectKeyboardType('unrecognized')).toBe('default');
    });
});
