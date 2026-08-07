// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {translateBlockKit} from './block_kit';

describe('translateBlockKit section accessory button', () => {
    it('should require a non-empty action_id', () => {
        const blocks = translateBlockKit([{
            type: 'section',
            text: {type: 'plain_text', text: 'Body'},
            accessory: {
                type: 'button',
                text: {type: 'plain_text', text: 'Go'},
                action_id: '',
            },
        }]);
        expect(blocks).toEqual([{
            type: 'container',
            content: [{type: 'text', text: 'Body'}],
        }]);
    });

    it('should keep accessory button when action_id is present', () => {
        const blocks = translateBlockKit([{
            type: 'section',
            text: {type: 'plain_text', text: 'Body'},
            accessory: {
                type: 'button',
                text: {type: 'plain_text', text: 'Go'},
                action_id: 'go_action',
                style: 'primary',
            },
        }]);
        const container = blocks[0] as MmContainerBlock;
        const columnSet = container.content[0] as MmColumnSetBlock;
        const button = columnSet.columns[1].items[0] as MmButtonBlock;
        expect(button).toMatchObject({
            type: 'button',
            action_id: 'go_action',
            text: 'Go',
            style: 'primary',
        });
    });
});

describe('translateBlockKit input plain_text_input', () => {
    it('should reject input blocks missing label or action_id', () => {
        expect(translateBlockKit([{
            type: 'input',
            element: {type: 'plain_text_input', action_id: 'title'},
        }])).toEqual([]);

        expect(translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Title'},
            element: {type: 'plain_text_input', action_id: ''},
        }])).toEqual([]);
    });

    it('should translate plain_text_input fields into text_input blocks', () => {
        expect(translateBlockKit([{
            type: 'input',
            optional: true,
            dispatch_action: true,
            label: {type: 'plain_text', text: 'Title'},
            hint: {type: 'plain_text', text: 'Enter a title'},
            element: {
                type: 'plain_text_input',
                action_id: 'title',
                multiline: true,
                placeholder: {type: 'plain_text', text: 'My title'},
                initial_value: 'Draft',
                min_length: 2,
                max_length: 80,
            },
        }])).toEqual([{
            type: 'text_input',
            name: 'title',
            label: 'Title',
            optional: true,
            help_text: 'Enter a title',
            multiline: true,
            placeholder: 'My title',
            initial_value: 'Draft',
            min_length: 2,
            max_length: 80,
            onChange: 'title',
        }]);
    });

    it('should translate datepicker, datetimepicker, and file_input elements', () => {
        expect(translateBlockKit([{
            type: 'input',
            optional: true,
            label: {type: 'plain_text', text: 'Due'},
            hint: {type: 'plain_text', text: 'When it is due'},
            element: {
                type: 'datepicker',
                action_id: 'due',
                placeholder: {type: 'plain_text', text: 'Pick a date'},
                initial_date: '2025-06-15',
            },
        }])).toEqual([{
            type: 'date_input',
            name: 'due',
            label: 'Due',
            optional: true,
            help_text: 'When it is due',
            placeholder: 'Pick a date',
            initial_value: '2025-06-15',
        }]);

        expect(translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Meeting'},
            dispatch_action: true,
            element: {
                type: 'datetimepicker',
                action_id: 'meeting',
                initial_date_time: 1718445600,
            },
        }])).toEqual([{
            type: 'datetime_input',
            name: 'meeting',
            label: 'Meeting',
            initial_value: '2024-06-15T10:00:00.000Z',
            onChange: 'meeting',
        }]);

        expect(translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Files'},
            element: {
                type: 'file_input',
                action_id: 'files',
                max_files: 5,
            },
        }])).toEqual([{
            type: 'file_input',
            name: 'files',
            label: 'Files',
            allow_multiple: true,
        }]);
    });

    it('should allow multiple files unless max_files is explicitly 1', () => {
        const fileInput = (maxFiles?: number) => translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Files'},
            element: {
                type: 'file_input',
                action_id: 'files',
                ...(maxFiles === undefined ? {} : {max_files: maxFiles}),
            },
        }]);

        expect(fileInput()).toEqual([expect.objectContaining({allow_multiple: true})]);
        expect(fileInput(1)).toEqual([{type: 'file_input', name: 'files', label: 'Files'}]);
    });

    it('should ignore unsupported input element types', () => {
        expect(translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Pick'},
            element: {
                type: 'external_select',
                action_id: 'pick',
            },
        }])).toEqual([]);
    });

    it('should translate static_select and radio_buttons input elements', () => {
        expect(translateBlockKit([{
            type: 'input',
            optional: true,
            label: {type: 'plain_text', text: 'Color'},
            element: {
                type: 'static_select',
                action_id: 'color',
                placeholder: {type: 'plain_text', text: 'Pick'},
                options: [{text: {type: 'plain_text', text: 'Red'}, value: 'red'}],
                initial_option: {text: {type: 'plain_text', text: 'Red'}, value: 'red'},
            },
        }])).toEqual([{
            type: 'select',
            name: 'color',
            label: 'Color',
            optional: true,
            placeholder: 'Pick',
            options: [{text: 'Red', value: 'red'}],
            initial_option: 'red',
        }]);

        expect(translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Size'},
            element: {
                type: 'radio_buttons',
                action_id: 'size',
                options: [{text: {type: 'plain_text', text: 'Large'}, value: 'l'}],
            },
        }])).toEqual([{
            type: 'select',
            name: 'size',
            label: 'Size',
            style: 'expanded',
            options: [{text: 'Large', value: 'l'}],
        }]);
    });

    it('should translate checkboxes and multi_static_select into multiselect blocks', () => {
        expect(translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Toppings'},
            element: {
                type: 'checkboxes',
                action_id: 'toppings',
                options: [
                    {text: {type: 'plain_text', text: 'Cheese'}, value: 'cheese'},
                    {text: {type: 'plain_text', text: 'Basil'}, value: 'basil'},
                ],
                initial_options: [{text: {type: 'plain_text', text: 'Basil'}, value: 'basil'}],
            },
        }])).toEqual([{
            type: 'select',
            name: 'toppings',
            label: 'Toppings',
            style: 'expanded',
            multiselect: true,
            options: [
                {text: 'Cheese', value: 'cheese'},
                {text: 'Basil', value: 'basil'},
            ],
            initial_options: ['basil'],
        }]);

        expect(translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Teams'},
            element: {
                type: 'multi_static_select',
                action_id: 'teams',
                option_groups: [{
                    label: {type: 'plain_text', text: 'Core'},
                    options: [{text: {type: 'plain_text', text: 'Web'}, value: 'web'}],
                }],
            },
        }])).toEqual([{
            type: 'select',
            name: 'teams',
            label: 'Teams',
            multiselect: true,
            option_groups: [{
                label: 'Core',
                options: [{text: 'Web', value: 'web'}],
            }],
        }]);
    });

    it('should reject select inputs with neither or both options and option_groups', () => {
        expect(translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Empty'},
            element: {type: 'static_select', action_id: 'empty'},
        }])).toEqual([]);

        expect(translateBlockKit([{
            type: 'input',
            label: {type: 'plain_text', text: 'Both'},
            element: {
                type: 'static_select',
                action_id: 'both',
                options: [{text: {type: 'plain_text', text: 'Red'}, value: 'red'}],
                option_groups: [{
                    label: {type: 'plain_text', text: 'Core'},
                    options: [{text: {type: 'plain_text', text: 'Web'}, value: 'web'}],
                }],
            },
        }])).toEqual([]);
    });
});
