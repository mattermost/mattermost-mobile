// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    convertAppFormValuesToDialogSubmission,
    convertDialogElementToAppField,
    convertDialogToAppForm,
} from './dialog_conversion';
import {DialogElementTypes} from './dialog_utils';

describe('dialog_conversion', () => {
    describe('convertAppFormValuesToDialogSubmission', () => {
        const mockElements: DialogElement[] = [
            {
                name: 'text_field',
                type: DialogElementTypes.TEXT,
                display_name: 'Text Field',
                optional: false,
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [],
            },
            {
                name: 'number_field',
                type: DialogElementTypes.TEXT,
                subtype: 'number',
                display_name: 'Number Field',
                optional: true,
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [],
            },
            {
                name: 'select_field',
                type: DialogElementTypes.SELECT,
                display_name: 'Select Field',
                optional: true,
                options: [
                    {value: 'option1', text: 'Option 1'},
                    {value: 'option2', text: 'Option 2'},
                ],
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
            },
            {
                name: 'radio_field',
                type: DialogElementTypes.RADIO,
                display_name: 'Radio Field',
                optional: false,
                options: [
                    {value: 'radio1', text: 'Radio 1'},
                    {value: 'radio2', text: 'Radio 2'},
                ],
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
            },
            {
                name: 'bool_field',
                type: DialogElementTypes.BOOL,
                display_name: 'Boolean Field',
                optional: true,
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [],
            },
        ];

        it('should convert text field values correctly', () => {
            const values: AppFormValues = {
                text_field: 'user input text',
                number_field: '123',
            };

            const result = convertAppFormValuesToDialogSubmission(values, mockElements);

            expect(result.submission).toEqual({
                text_field: 'user input text',
                number_field: 123, // Should be converted to number
            });
            expect(result.errors).toEqual([]);
        });

        it('should handle empty number fields by omitting them', () => {
            const values: AppFormValues = {
                text_field: 'user input text',
                number_field: '', // Empty number field
            };

            const result = convertAppFormValuesToDialogSubmission(values, mockElements);

            expect(result.submission).toEqual({
                text_field: 'user input text',

                // number_field should be omitted
            });
            expect(result.errors).toEqual([]);
        });

        it('should handle null/undefined number fields by omitting them', () => {
            const values: AppFormValues = {
                text_field: 'user input text',
                number_field: null,
            };

            const result = convertAppFormValuesToDialogSubmission(values, mockElements);

            expect(result.submission).toEqual({
                text_field: 'user input text',

                // number_field should be omitted
            });
            expect(result.errors).toEqual([]);
        });

        it('should handle invalid number fields as strings', () => {
            const values: AppFormValues = {
                text_field: 'user input text',
                number_field: 'not a number',
            };

            const result = convertAppFormValuesToDialogSubmission(values, mockElements);

            expect(result.submission).toEqual({
                text_field: 'user input text',
                number_field: 'not a number', // Should remain as string
            });
            expect(result.errors).toEqual([]);
        });

        it('should convert AppSelectOption objects to values', () => {
            const values: AppFormValues = {
                select_field: {label: 'Option 1', value: 'option1'},
                radio_field: {label: 'Radio 2', value: 'radio2'},
            };

            const result = convertAppFormValuesToDialogSubmission(values, mockElements);

            expect(result.submission).toEqual({
                select_field: 'option1',
                radio_field: 'radio2',
            });
            expect(result.errors).toEqual([]);
        });

        it('should handle string values for select/radio fields', () => {
            const values: AppFormValues = {
                select_field: 'option2',
                radio_field: 'radio1',
            };

            const result = convertAppFormValuesToDialogSubmission(values, mockElements);

            expect(result.submission).toEqual({
                select_field: 'option2',
                radio_field: 'radio1',
            });
            expect(result.errors).toEqual([]);
        });

        it('should convert boolean values correctly', () => {
            const values: AppFormValues = {
                bool_field: true,
            };

            const result = convertAppFormValuesToDialogSubmission(values, mockElements);

            expect(result.submission).toEqual({
                bool_field: true,
            });
            expect(result.errors).toEqual([]);
        });

        it('should handle falsy boolean values', () => {
            const values: AppFormValues = {
                bool_field: false,
            };

            const result = convertAppFormValuesToDialogSubmission(values, mockElements);

            expect(result.submission).toEqual({
                bool_field: false,
            });
            expect(result.errors).toEqual([]);
        });

        it('should handle unknown field types as strings', () => {
            const elementsWithUnknown: DialogElement[] = [
                {
                    name: 'unknown_field',
                    type: 'unknown_type' as any,
                    display_name: 'Unknown Field',
                    optional: true,
                    default: '',
                    placeholder: '',
                    help_text: '',
                    min_length: 0,
                    max_length: 0,
                    data_source: '',
                    options: [],
                },
            ];

            const values: AppFormValues = {
                unknown_field: 'some value',
            };

            const result = convertAppFormValuesToDialogSubmission(values, elementsWithUnknown);

            expect(result.submission).toEqual({
                unknown_field: 'some value',
            });
            expect(result.errors).toEqual([]);
        });

        it('should report errors for fields not found in elements', () => {
            const values: AppFormValues = {
                text_field: 'valid field',
                nonexistent_field: 'invalid field',
            };

            const result = convertAppFormValuesToDialogSubmission(values, mockElements);

            expect(result.submission).toEqual({
                text_field: 'valid field',
            });
            expect(result.errors).toEqual(['Field nonexistent_field not found in dialog elements']);
        });

        it('should handle empty values object', () => {
            const result = convertAppFormValuesToDialogSubmission({}, mockElements);

            expect(result.submission).toEqual({});
            expect(result.errors).toEqual([]);
        });

        it('should handle empty elements array', () => {
            const values: AppFormValues = {
                some_field: 'some value',
            };

            const result = convertAppFormValuesToDialogSubmission(values, []);

            expect(result.submission).toEqual({});
            expect(result.errors).toEqual(['Field some_field not found in dialog elements']);
        });

        it('should handle multiselect AppSelectOption arrays', () => {
            const mockMultiselectElement: DialogElement = {
                name: 'multiselect_field',
                type: DialogElementTypes.SELECT,
                multiselect: true,
                display_name: 'Multi Select',
                optional: false,
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [
                    {value: 'opt1', text: 'Option 1'},
                    {value: 'opt2', text: 'Option 2'},
                    {value: 'opt3', text: 'Option 3'},
                ],
            };

            const values: AppFormValues = {
                multiselect_field: [
                    {label: 'Option 1', value: 'opt1'},
                    {label: 'Option 3', value: 'opt3'},
                ],
            };

            const result = convertAppFormValuesToDialogSubmission(values, [mockMultiselectElement]);

            expect(result.submission).toEqual({
                multiselect_field: 'opt1,opt3',
            });
            expect(result.errors).toEqual([]);
        });

        it('should handle multiselect string arrays', () => {
            const mockMultiselectElement: DialogElement = {
                name: 'multiselect_field',
                type: DialogElementTypes.SELECT,
                multiselect: true,
                display_name: 'Multi Select',
                optional: false,
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [
                    {value: 'opt1', text: 'Option 1'},
                    {value: 'opt2', text: 'Option 2'},
                ],
            };

            const values: AppFormValues = {
                multiselect_field: ['opt1', 'opt2'] as any,
            };

            const result = convertAppFormValuesToDialogSubmission(values, [mockMultiselectElement]);

            expect(result.submission).toEqual({
                multiselect_field: 'opt1,opt2',
            });
            expect(result.errors).toEqual([]);
        });

        it('should handle empty multiselect arrays', () => {
            const mockMultiselectElement: DialogElement = {
                name: 'multiselect_field',
                type: DialogElementTypes.SELECT,
                multiselect: true,
                display_name: 'Multi Select',
                optional: true,
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [],
            };

            const values: AppFormValues = {
                multiselect_field: [],
            };

            const result = convertAppFormValuesToDialogSubmission(values, [mockMultiselectElement]);

            expect(result.submission).toEqual({
                multiselect_field: '',
            });
            expect(result.errors).toEqual([]);
        });

        it('should not affect single select with multiselect=false', () => {
            const mockSingleSelectElement: DialogElement = {
                name: 'single_select',
                type: DialogElementTypes.SELECT,
                multiselect: false,
                display_name: 'Single Select',
                optional: false,
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [
                    {value: 'opt1', text: 'Option 1'},
                ],
            };

            const values: AppFormValues = {
                single_select: {label: 'Option 1', value: 'opt1'},
            };

            const result = convertAppFormValuesToDialogSubmission(values, [mockSingleSelectElement]);

            expect(result.submission).toEqual({
                single_select: 'opt1',
            });
            expect(result.errors).toEqual([]);
        });
    });

    describe('convertDialogElementToAppField', () => {
        it('should convert text element correctly', () => {
            const element: DialogElement = {
                name: 'text_field',
                type: DialogElementTypes.TEXT,
                display_name: 'Text Field',
                help_text: 'Enter some text',
                placeholder: 'Type here',
                default: 'default value',
                optional: false,
                min_length: 5,
                max_length: 100,
                data_source: '',
                options: [],
            };

            const result = convertDialogElementToAppField(element);

            expect(result).toEqual({
                name: 'text_field',
                type: 'text',
                is_required: true,
                label: 'Text Field',
                description: 'Enter some text',
                position: 0,
                hint: 'Type here',
                value: 'default value',
                min_length: 5,
                max_length: 100,
            });
        });

        it('should convert textarea element correctly', () => {
            const element: DialogElement = {
                name: 'textarea_field',
                type: DialogElementTypes.TEXTAREA,
                display_name: 'Textarea Field',
                help_text: 'Enter multiple lines',
                optional: true,
                min_length: 10,
                max_length: 500,
                default: '',
                placeholder: '',
                data_source: '',
                options: [],
            };

            const result = convertDialogElementToAppField(element);

            expect(result).toEqual({
                name: 'textarea_field',
                type: 'text',
                is_required: false,
                label: 'Textarea Field',
                description: 'Enter multiple lines',
                position: 0,
                min_length: 10,
                max_length: 500,
            });
        });

        it('should convert select element correctly', () => {
            const element: DialogElement = {
                name: 'select_field',
                type: DialogElementTypes.SELECT,
                display_name: 'Select Field',
                help_text: 'Choose an option',
                optional: true,
                options: [
                    {value: 'opt1', text: 'Option 1'},
                    {value: 'opt2', text: 'Option 2'},
                ],
                default: 'opt1',
                placeholder: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
            };

            const result = convertDialogElementToAppField(element);

            expect(result).toEqual({
                name: 'select_field',
                type: 'static_select',
                is_required: false,
                label: 'Select Field',
                description: 'Choose an option',
                position: 0,
                value: 'opt1',
                options: [
                    {label: 'Option 1', value: 'opt1'},
                    {label: 'Option 2', value: 'opt2'},
                ],
            });
        });

        it('should convert multiselect element correctly', () => {
            const element: DialogElement = {
                name: 'multiselect_field',
                type: DialogElementTypes.SELECT,
                display_name: 'Multiselect Field',
                help_text: 'Choose multiple options',
                optional: false,
                multiselect: true,
                options: [
                    {value: 'opt1', text: 'Option 1'},
                    {value: 'opt2', text: 'Option 2'},
                    {value: 'opt3', text: 'Option 3'},
                ],
                default: 'opt1,opt3',
                placeholder: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
            };

            const result = convertDialogElementToAppField(element);

            expect(result).toEqual({
                name: 'multiselect_field',
                type: 'static_select',
                is_required: true,
                label: 'Multiselect Field',
                description: 'Choose multiple options',
                position: 0,
                value: 'opt1,opt3',
                multiselect: true,
                options: [
                    {label: 'Option 1', value: 'opt1'},
                    {label: 'Option 2', value: 'opt2'},
                    {label: 'Option 3', value: 'opt3'},
                ],
            });
        });

        it('should convert radio element correctly', () => {
            const element: DialogElement = {
                name: 'radio_field',
                type: DialogElementTypes.RADIO,
                display_name: 'Radio Field',
                help_text: 'Choose one',
                optional: false,
                options: [
                    {value: 'radio1', text: 'Radio Option 1'},
                    {value: 'radio2', text: 'Radio Option 2'},
                ],
                default: 'radio2',
                placeholder: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
            };

            const result = convertDialogElementToAppField(element);

            expect(result).toEqual({
                name: 'radio_field',
                type: 'radio',
                is_required: true,
                label: 'Radio Field',
                description: 'Choose one',
                position: 0,
                value: 'radio2',
                options: [
                    {label: 'Radio Option 1', value: 'radio1'},
                    {label: 'Radio Option 2', value: 'radio2'},
                ],
            });
        });

        it('should convert boolean element correctly', () => {
            const element: DialogElement = {
                name: 'bool_field',
                type: DialogElementTypes.BOOL,
                display_name: 'Boolean Field',
                help_text: 'Check if applicable',
                optional: true,
                default: 'true',
                placeholder: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [],
            };

            const result = convertDialogElementToAppField(element);

            expect(result).toEqual({
                name: 'bool_field',
                type: 'bool',
                is_required: false,
                label: 'Boolean Field',
                description: 'Check if applicable',
                position: 0,
                value: 'true',
            });
        });

        it('should handle elements without options', () => {
            const element: DialogElement = {
                name: 'text_field',
                type: DialogElementTypes.TEXT,
                display_name: 'Text Field',
                optional: false,
                options: [],
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
            };

            const result = convertDialogElementToAppField(element);

            expect(result.options).toBeUndefined();
            expect(result.type).toBe('text');
        });

        it('should handle empty options array', () => {
            const element: DialogElement = {
                name: 'select_field',
                type: DialogElementTypes.SELECT,
                display_name: 'Select Field',
                optional: false,
                options: [],
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
            };

            const result = convertDialogElementToAppField(element);

            expect(result.options).toEqual([]);
        });

        it('should not add hint when placeholder is empty', () => {
            const element: DialogElement = {
                name: 'text_field',
                type: DialogElementTypes.TEXT,
                display_name: 'Text Field',
                optional: false,
                placeholder: '',
                default: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [],
            };

            const result = convertDialogElementToAppField(element);

            expect(result.hint).toBeUndefined();
        });

        it('should not add value when default is empty', () => {
            const element: DialogElement = {
                name: 'text_field',
                type: DialogElementTypes.TEXT,
                display_name: 'Text Field',
                optional: false,
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [],
            };

            const result = convertDialogElementToAppField(element);

            expect(result.value).toBeUndefined();
        });
    });

    describe('convertDialogToAppForm', () => {
        const mockConfig: InteractiveDialogConfig = {
            app_id: 'test-app',
            dialog: {
                callback_id: 'test-callback',
                title: 'Test Dialog',
                introduction_text: 'Please fill out the form',
                elements: [
                    {
                        name: 'text_field',
                        type: DialogElementTypes.TEXT,
                        display_name: 'Text Field',
                        help_text: 'Enter some text',
                        optional: false,
                        default: 'default text',
                        placeholder: '',
                        min_length: 0,
                        max_length: 0,
                        data_source: '',
                        options: [],
                    },
                    {
                        name: 'select_field',
                        type: DialogElementTypes.SELECT,
                        display_name: 'Select Field',
                        help_text: 'Choose an option',
                        optional: true,
                        options: [
                            {value: 'opt1', text: 'Option 1'},
                            {value: 'opt2', text: 'Option 2'},
                        ],
                        default: '',
                        placeholder: '',
                        min_length: 0,
                        max_length: 0,
                        data_source: '',
                    },
                ],
                submit_label: 'Submit',
                state: 'test-state',
                notify_on_cancel: false,
            },
            url: 'https://test.com/dialog',
            trigger_id: 'test-trigger-id',
        };

        it('should convert dialog config to app form correctly', () => {
            const result = convertDialogToAppForm(mockConfig);

            expect(result).toEqual({
                title: 'Test Dialog',
                header: 'Please fill out the form',
                fields: [
                    {
                        name: 'text_field',
                        type: 'text',
                        is_required: true,
                        label: 'Text Field',
                        description: 'Enter some text',
                        position: 0,
                        value: 'default text',
                        min_length: 0,
                        max_length: 0,
                    },
                    {
                        name: 'select_field',
                        type: 'static_select',
                        is_required: false,
                        label: 'Select Field',
                        description: 'Choose an option',
                        position: 1,
                        options: [
                            {label: 'Option 1', value: 'opt1'},
                            {label: 'Option 2', value: 'opt2'},
                        ],
                    },
                ],
                submit_buttons: undefined,
                source: undefined,
                submit: {
                    path: '/dialog/submit',
                    expand: {},
                },
            });
        });

        it('should handle dialog without elements', () => {
            const configWithoutElements = {
                ...mockConfig,
                dialog: {
                    ...mockConfig.dialog,
                    elements: [],
                },
            };

            const result = convertDialogToAppForm(configWithoutElements);

            expect(result.fields).toEqual([]);
        });

        it('should handle dialog with empty elements array', () => {
            const configWithEmptyElements = {
                ...mockConfig,
                dialog: {
                    ...mockConfig.dialog,
                    elements: [],
                },
            };

            const result = convertDialogToAppForm(configWithEmptyElements);

            expect(result.fields).toEqual([]);
        });

        it('should handle dialog without introduction text', () => {
            const configWithoutIntro = {
                ...mockConfig,
                dialog: {
                    ...mockConfig.dialog,
                    introduction_text: '',
                },
            };

            const result = convertDialogToAppForm(configWithoutIntro);

            expect(result.header).toBeUndefined();
        });

        it('should set correct position for each field', () => {
            const configWithManyFields = {
                ...mockConfig,
                dialog: {
                    ...mockConfig.dialog,
                    elements: [
                        {
                            name: 'field1',
                            type: DialogElementTypes.TEXT,
                            display_name: 'Field 1',
                            optional: false,
                            default: '',
                            placeholder: '',
                            help_text: '',
                            min_length: 0,
                            max_length: 0,
                            data_source: '',
                            options: [],
                        },
                        {
                            name: 'field2',
                            type: DialogElementTypes.TEXT,
                            display_name: 'Field 2',
                            optional: false,
                            default: '',
                            placeholder: '',
                            help_text: '',
                            min_length: 0,
                            max_length: 0,
                            data_source: '',
                            options: [],
                        },
                        {
                            name: 'field3',
                            type: DialogElementTypes.TEXT,
                            display_name: 'Field 3',
                            optional: false,
                            default: '',
                            placeholder: '',
                            help_text: '',
                            min_length: 0,
                            max_length: 0,
                            data_source: '',
                            options: [],
                        },
                    ],
                },
            };

            const result = convertDialogToAppForm(configWithManyFields as InteractiveDialogConfig);

            expect(result.fields![0].position).toBe(0);
            expect(result.fields![1].position).toBe(1);
            expect(result.fields![2].position).toBe(2);
        });

        it('should always have the same submit structure', () => {
            const result = convertDialogToAppForm(mockConfig);

            expect(result.submit).toEqual({
                path: '/dialog/submit',
                expand: {},
            });
            expect(result.submit_buttons).toBeUndefined();
            expect(result.source).toBeUndefined();
        });
    });
});
