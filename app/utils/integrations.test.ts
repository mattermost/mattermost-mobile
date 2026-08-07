// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    checkDateTimeFieldValue,
    checkDialogElementForError,
    checkIfErrorsMatchElements,
    dialogFieldErrorMessages,
    formatDialogFieldError,
    selectKeyboardType,
} from './integrations';

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

function dialogElement(overrides: Partial<DialogElement> = {}): DialogElement {
    return {
        name: 'field1',
        type: 'text',
        display_name: '',
        subtype: undefined,
        default: '',
        placeholder: '',
        help_text: '',
        optional: false,
        min_length: 0,
        max_length: 0,
        data_source: '',
        options: [],
        ...overrides,
    };
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

    it('should return required error for an empty required radio', () => {
        const elem = dialogElement({type: 'radio', options: [{text: 'One', value: '1'}]});

        expect(checkDialogElementForError(elem, '', makeIntl())).toBe('This field is required.');
    });

    it('should skip option validation for an empty optional radio', () => {
        const elem = dialogElement({type: 'radio', optional: true, options: [{text: 'One', value: '1'}]});

        expect(checkDialogElementForError(elem, '', makeIntl())).toBeNull();
    });

    it('should return required error for an empty required select', () => {
        const elem = dialogElement({type: 'select', options: [{text: 'One', value: '1'}]});

        expect(checkDialogElementForError(elem, '', makeIntl())).toBe('This field is required.');
    });

    it('should return invalid option error for a single select value outside the options', () => {
        const elem = dialogElement({type: 'select', options: [{text: 'One', value: '1'}]});

        expect(checkDialogElementForError(elem, '2', makeIntl())).toBe('Must be a valid option');
    });

    it('should unwrap select and radio option objects before validating them', () => {
        const select = dialogElement({type: 'select', options: [{text: 'One', value: '1'}]});
        const radio = dialogElement({type: 'radio', options: [{text: 'One', value: '1'}]});

        expect(checkDialogElementForError(select, {text: 'One', value: '1'}, makeIntl())).toBeNull();
        expect(checkDialogElementForError(select, {text: 'Two', value: '2'}, makeIntl())).toBe('Must be a valid option');
        expect(checkDialogElementForError(radio, {text: 'One', value: '1'}, makeIntl())).toBeNull();
        expect(checkDialogElementForError(radio, {text: 'Two', value: '2'}, makeIntl())).toBe('Must be a valid option');
    });

    it('should skip option validation when the select has no options', () => {
        const elem = dialogElement({type: 'select', options: undefined as unknown as DialogOption[]});

        expect(checkDialogElementForError(elem, 'anything', makeIntl())).toBeNull();
    });

    it('should return null for element types without value validation', () => {
        const elem = dialogElement({type: 'file'});

        expect(checkDialogElementForError(elem, 'file-1', makeIntl())).toBeNull();
    });

    it('should require a required bool field to be checked', () => {
        const elem = dialogElement({type: 'bool'});

        expect(checkDialogElementForError(elem, false, makeIntl())).toBe('This field is required.');
        expect(checkDialogElementForError(elem, true, makeIntl())).toBeNull();
    });

    it('should allow an unchecked optional bool field', () => {
        const elem = dialogElement({type: 'bool', optional: true});

        expect(checkDialogElementForError(elem, false, makeIntl())).toBeNull();
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

        it('should unwrap option objects in multiselect arrays', () => {
            expect(checkDialogElementForError(multiselectElement, [{text: 'Option A', value: 'optA'}], makeIntl())).toBeNull();
            expect(checkDialogElementForError(multiselectElement, [{text: 'Option D', value: 'optD'}], makeIntl())).toBe('Must be a valid option');
        });

        it('should handle all options selected', () => {
            expect(checkDialogElementForError(multiselectElement, ['optA', 'optB', 'optC'], makeIntl())).toBeNull();
        });
    });
});

describe('formatDialogFieldError', () => {
    it.each(Object.entries(dialogFieldErrorMessages))('should format the %s descriptor', (_name, descriptor) => {
        expect(formatDialogFieldError(makeIntl(), descriptor)).toBe(descriptor.defaultMessage);
    });

    it('should interpolate the length values', () => {
        const intl = makeIntl();

        expect(formatDialogFieldError(intl, {...dialogFieldErrorMessages.tooShort, values: {minLength: 5}})).toBe('Minimum input length is 5.');
        expect(formatDialogFieldError(intl, {...dialogFieldErrorMessages.tooLong, values: {maxLength: 10}})).toBe('Maximum input length is 10.');
    });

    it('should fall back to the default message for an unknown error id', () => {
        expect(formatDialogFieldError(makeIntl(), {
            id: 'some.unmapped.error',
            defaultMessage: 'Something went wrong',
        })).toBe('Something went wrong');
    });
});

describe('checkDateTimeFieldValue', () => {
    it('should reject a value that is not a parseable date', () => {
        expect(checkDateTimeFieldValue('not-a-date', 'date')).toBe(dialogFieldErrorMessages.badFormat);
    });

    it('should require the YYYY-MM-DD storage format for date fields', () => {
        expect(checkDateTimeFieldValue('2026-07-30T10:00:00Z', 'date')).toBe(dialogFieldErrorMessages.badDateFormat);
        expect(checkDateTimeFieldValue('2026-07-30', 'date')).toBeNull();
    });

    it('should require a timezone offset for datetime fields', () => {
        expect(checkDateTimeFieldValue('2026-07-30T10:00:00', 'datetime')).toBe(dialogFieldErrorMessages.badDatetimeFormat);
        expect(checkDateTimeFieldValue('2026-07-30T10:00:00Z', 'datetime')).toBeNull();
        expect(checkDateTimeFieldValue('2026-07-30T10:00:00.500+02:00', 'datetime')).toBeNull();
    });

    it('should enforce the min and max bounds', () => {
        expect(checkDateTimeFieldValue('2026-07-30', 'date', {min_date: '2026-08-01'})).toBe(dialogFieldErrorMessages.beforeMinDate);
        expect(checkDateTimeFieldValue('2026-07-30', 'date', {max_date: '2026-07-01'})).toBe(dialogFieldErrorMessages.afterMaxDate);
        expect(checkDateTimeFieldValue('2026-07-30', 'date', {min_date: '2026-07-01', max_date: '2026-08-01'})).toBeNull();
    });

    it('should prefer the datetime_config bounds over the top level ones', () => {
        expect(checkDateTimeFieldValue('2026-07-30T10:00:00Z', 'datetime', {
            min_date: '2020-01-01',
            datetime_config: {min_date: '2026-08-01'},
        })).toBe(dialogFieldErrorMessages.beforeMinDate);

        expect(checkDateTimeFieldValue('2026-07-30T10:00:00Z', 'datetime', {
            max_date: '2030-01-01',
            datetime_config: {max_date: '2026-07-01'},
        })).toBe(dialogFieldErrorMessages.afterMaxDate);
    });

    it('should resolve relative bounds', () => {
        expect(checkDateTimeFieldValue('2020-01-01', 'date', {min_date: 'today'})).toBe(dialogFieldErrorMessages.beforeMinDate);
    });

    it('should ignore bounds that cannot be resolved to a date', () => {
        expect(checkDateTimeFieldValue('2026-07-30', 'date', {min_date: 'nonsense', max_date: 'nonsense'})).toBeNull();
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
