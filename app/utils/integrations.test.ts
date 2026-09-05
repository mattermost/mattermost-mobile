// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {checkDialogElementForError, checkIfErrorsMatchElements, selectKeyboardType} from './integrations';

import type {IntlShape, MessageDescriptor} from 'react-intl';

function makeIntl(): IntlShape {
    return {
        formatMessage: jest.fn((descriptor: MessageDescriptor, values?: Record<string, unknown>) => {
            if (values && Object.keys(values).length > 0) {
                let msg = descriptor.defaultMessage as string;
                for (const [k, v] of Object.entries(values)) {
                    msg = msg.replace(`{${k}}`, String(v));
                }
                return msg;
            }
            return descriptor.defaultMessage as string;
        }),
    } as unknown as IntlShape;
}

describe('checkDialogElementForError', () => {
    it('should return required error for empty required field', () => {
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
        expect(checkDialogElementForError(elem, '', makeIntl())).toBe('This field is required.');
    });

    it('should return too short error for text shorter than min_length', () => {
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
        expect(checkDialogElementForError(elem, '123', makeIntl())).toBe('Minimum input length is 5.');
    });

    it('should return bad email error for invalid email', () => {
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
        expect(checkDialogElementForError(elem, 'invalidemail', makeIntl())).toBe('Must be a valid email address.');
    });

    it('should return bad number error for invalid number', () => {
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
        expect(checkDialogElementForError(elem, 'notanumber', makeIntl())).toBe('Must be a number.');
    });

    it('should return bad URL error for invalid URL', () => {
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
        expect(checkDialogElementForError(elem, 'invalidurl', makeIntl())).toBe('URL must include http:// or https://.');
    });

    it('should return invalid option error for invalid radio option', () => {
        const elem: DialogElement = {
            name: 'field1',
            type: 'radio',
            options: [{value: 'option1', text: ''}, {value: 'option2', text: ''}],
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
        expect(checkDialogElementForError(elem, 'invalidoption', makeIntl())).toBe('Must be a valid option');
    });

    it('should return null for valid inputs', () => {
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
            options: [{value: 'option1', text: ''}, {value: 'option2', text: ''}],
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
        const intl = makeIntl();
        expect(checkDialogElementForError(elemText, 'valid', intl)).toBeNull();
        expect(checkDialogElementForError(elemEmail, 'email@example.com', intl)).toBeNull();
        expect(checkDialogElementForError(elemNumber, '123', intl)).toBeNull();
        expect(checkDialogElementForError(elemURL, 'http://example.com', intl)).toBeNull();
        expect(checkDialogElementForError(elemRadio, 'option1', intl)).toBeNull();
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

        it('should validate multiselect values correctly', () => {
            expect(checkDialogElementForError(multiselectElement, ['optA', 'optC'], makeIntl())).toBeNull();
        });

        it('should require at least one selection for required multiselect', () => {
            expect(checkDialogElementForError(multiselectElement, [], makeIntl())).toBe('This field is required.');
        });

        it('should reject invalid options in multiselect array', () => {
            expect(checkDialogElementForError(multiselectElement, ['optA', 'invalidOption'], makeIntl())).toBe('Must be a valid option');
        });

        it('should allow empty arrays for optional multiselect', () => {
            const optionalElement = {...multiselectElement, optional: true};
            expect(checkDialogElementForError(optionalElement, [], makeIntl())).toBeNull();
        });

        it('should handle single valid option in multiselect', () => {
            expect(checkDialogElementForError(multiselectElement, ['optB'], makeIntl())).toBeNull();
        });

        it('should handle all options selected', () => {
            expect(checkDialogElementForError(multiselectElement, ['optA', 'optB', 'optC'], makeIntl())).toBeNull();
        });
    });
});

describe('checkDialogElementForError - checkbox_group', () => {
    const checkboxGroupElement: DialogElement = {
        name: 'checkbox_group_field',
        type: 'checkbox_group',
        optional: false,
        options: [
            {text: 'Option A', value: 'optA'},
            {text: 'Option B', value: 'optB'},
        ],
        display_name: 'Checkbox Group Field',
        placeholder: '',
        help_text: '',
        default: '',
        min_length: 0,
        max_length: 0,
        data_source: '',
    };

    it('should return required error for undefined value on required field', () => {
        expect(checkDialogElementForError(checkboxGroupElement, undefined, makeIntl())).toBe('This field is required.');
    });

    it('should return required error for empty array on required field', () => {
        expect(checkDialogElementForError(checkboxGroupElement, [], makeIntl())).toBe('This field is required.');
    });

    it('should allow empty array for optional field', () => {
        const optionalElement = {...checkboxGroupElement, optional: true};
        expect(checkDialogElementForError(optionalElement, [], makeIntl())).toBeNull();
    });

    it('should return invalid option error when a selected value is not in options', () => {
        expect(checkDialogElementForError(checkboxGroupElement, ['optA', 'invalid'], makeIntl())).toBe('Must be a valid option');
    });

    it('should return null for valid selections', () => {
        expect(checkDialogElementForError(checkboxGroupElement, ['optA', 'optB'], makeIntl())).toBeNull();
    });
});

describe('checkDialogElementForError - checkbox_matrix', () => {
    const checkboxMatrixElement: DialogElement = {
        name: 'checkbox_matrix_field',
        type: 'checkbox_matrix',
        optional: false,
        options: [],
        display_name: 'Checkbox Matrix Field',
        placeholder: '',
        help_text: '',
        default: '',
        min_length: 0,
        max_length: 0,
        data_source: '',
        matrix_config: {
            rows: [
                {text: 'Row 1', value: 'row1'},
                {text: 'Row 2', value: 'row2'},
            ],
            columns: [
                {text: 'Col 1', value: 'col1'},
                {text: 'Col 2', value: 'col2'},
            ],
            row_selection: 'multiple',
        },
    };

    it('should return required error for undefined value on required field', () => {
        expect(checkDialogElementForError(checkboxMatrixElement, undefined, makeIntl())).toBe('This field is required.');
    });

    it('should return required error for empty array on required field', () => {
        expect(checkDialogElementForError(checkboxMatrixElement, [], makeIntl())).toBe('This field is required.');
    });

    it('should return null for a valid matrix selection', () => {
        expect(checkDialogElementForError(checkboxMatrixElement, ['row1:col1,col2', 'row2:col1'], makeIntl())).toBeNull();
    });

    it('should return invalid format error for a malformed entry with no colon', () => {
        expect(checkDialogElementForError(checkboxMatrixElement, ['row1col1'], makeIntl())).toBe('Invalid matrix selection format');
    });

    it('should return invalid format error for an unknown row value', () => {
        expect(checkDialogElementForError(checkboxMatrixElement, ['unknownRow:col1'], makeIntl())).toBe('Invalid matrix selection format');
    });

    it('should return invalid format error for an unknown column value', () => {
        expect(checkDialogElementForError(checkboxMatrixElement, ['row1:unknownCol'], makeIntl())).toBe('Invalid matrix selection format');
    });

    it('should return invalid format error for a duplicate row', () => {
        expect(checkDialogElementForError(checkboxMatrixElement, ['row1:col1', 'row1:col2'], makeIntl())).toBe('Invalid matrix selection format');
    });

    it('should reject more than one column when row_selection is single', () => {
        const singleSelectionElement = {
            ...checkboxMatrixElement,
            matrix_config: {...checkboxMatrixElement.matrix_config!, row_selection: 'single' as const},
        };
        expect(checkDialogElementForError(singleSelectionElement, ['row1:col1,col2'], makeIntl())).toBe('Invalid matrix selection format');
    });

    it('should allow a single column when row_selection is single', () => {
        const singleSelectionElement = {
            ...checkboxMatrixElement,
            matrix_config: {...checkboxMatrixElement.matrix_config!, row_selection: 'single' as const},
        };
        expect(checkDialogElementForError(singleSelectionElement, ['row1:col1'], makeIntl())).toBeNull();
    });
});

describe('checkIfErrorsMatchElements', () => {
    it('should return false if no dialog elements', () => {
        const errors = {field1: 'error'};
        expect(checkIfErrorsMatchElements(errors)).toBe(false);
    });

    it('should return false if no dialog errors', () => {
        expect(checkIfErrorsMatchElements()).toBe(false);
    });

    it('should return true if errors match elements', () => {
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

    it('should return false if errors do not match elements', () => {
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

    it('should return false if errors and elements are empty', () => {
        expect(checkIfErrorsMatchElements({}, [])).toBe(false);
    });
});

describe('selectKeyboardType', () => {
    it('should return email-address for email subtype', () => {
        expect(selectKeyboardType('email')).toBe('email-address');
    });

    it('should return numeric for number subtype', () => {
        expect(selectKeyboardType('number')).toBe('numeric');
    });

    it('should return phone-pad for tel subtype', () => {
        expect(selectKeyboardType('tel')).toBe('phone-pad');
    });

    it('should return url for url subtype', () => {
        expect(selectKeyboardType('url')).toBe('url');
    });

    it('should return default for undefined subtype', () => {
        expect(selectKeyboardType()).toBe('default');
    });

    it('should return default for unrecognized subtype', () => {
        expect(selectKeyboardType('unrecognized')).toBe('default');
    });
});

describe('checkDialogElementForError - date/datetime fields', () => {
    const baseElement: DialogElement = {
        name: 'test_date',
        type: 'date',
        display_name: 'Test Date',
        subtype: undefined,
        default: '',
        placeholder: '',
        help_text: '',
        optional: false,
        min_length: 0,
        max_length: 0,
        data_source: '',
        options: [],
    };

    test('returns required error for empty required date field', () => {
        const result = checkDialogElementForError(baseElement, '', makeIntl());
        expect(result).toBe('This field is required.');
    });

    test('returns required error for undefined required date field', () => {
        const result = checkDialogElementForError(baseElement, undefined, makeIntl());
        expect(result).toBe('This field is required.');
    });

    test('returns required error for null required date field', () => {
        const result = checkDialogElementForError(baseElement, null, makeIntl());
        expect(result).toBe('This field is required.');
    });

    test('returns no error for valid date value', () => {
        const result = checkDialogElementForError(baseElement, '2026-02-12', makeIntl());
        expect(result).toBeNull();
    });

    test('returns no error for optional empty date field', () => {
        const optionalElement = {...baseElement, optional: true};
        const result = checkDialogElementForError(optionalElement, '', makeIntl());
        expect(result).toBeNull();
    });

    test('returns required error for empty required datetime field', () => {
        const datetimeElement = {...baseElement, type: 'datetime' as InteractiveDialogElementType};
        const result = checkDialogElementForError(datetimeElement, '', makeIntl());
        expect(result).toBe('This field is required.');
    });

    test('returns no error for valid datetime value', () => {
        const datetimeElement = {...baseElement, type: 'datetime' as InteractiveDialogElementType};
        const result = checkDialogElementForError(datetimeElement, '2026-02-12T14:30:00Z', makeIntl());
        expect(result).toBeNull();
    });
});
