// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    convertDialogElementToMmBlock,
    convertDialogToMmBlocks,
    dialogShouldShowSubmitChrome,
    DIALOG_SUBMIT_ACTION_ID,
} from './dialog_to_mm_blocks';

describe('convertDialogToMmBlocks', () => {
    const textElement: DialogElement = {
        display_name: 'Name',
        name: 'name',
        type: 'text',
        default: 'Ada',
        placeholder: 'Enter name',
        help_text: 'Your name',
        optional: false,
        min_length: 0,
        max_length: 100,
        data_source: '',
        options: [],
    };

    it('should convert text, bool, select, and radio elements without footer submit chrome', () => {
        const elements: DialogElement[] = [
            textElement,
            {
                ...textElement,
                name: 'enabled',
                display_name: 'Enabled',
                type: 'bool',
                default: 'true',
            },
            {
                ...textElement,
                name: 'choice',
                display_name: 'Choice',
                type: 'select',
                options: [{text: 'One', value: '1'}, {text: 'Two', value: '2'}],
            },
            {
                ...textElement,
                name: 'color',
                display_name: 'Color',
                type: 'radio',
                options: [{text: 'Red', value: 'red'}],
                default: 'red',
            },
        ];

        const {blocks, errors} = convertDialogToMmBlocks(elements, 'Intro');

        expect(errors).toEqual([]);
        expect(blocks).toHaveLength(5);
        expect(blocks[0]).toMatchObject({type: 'text', text: 'Intro'});
        expect(blocks[1]).toMatchObject({type: 'text_input', name: 'name', initial_value: 'Ada'});
        expect(blocks[2]).toMatchObject({type: 'bool_input', name: 'enabled', initial_value: true});
        expect(blocks[3]).toMatchObject({type: 'select', name: 'choice', options: [{text: 'One', value: '1'}, {text: 'Two', value: '2'}]});
        expect(blocks[4]).toMatchObject({type: 'select', name: 'color', style: 'expanded', initial_option: 'red'});
        expect(blocks.some((b) => b.type === 'button' && 'action_id' in b && b.action_id === DIALOG_SUBMIT_ACTION_ID)).toBe(false);
        expect(dialogShouldShowSubmitChrome(elements, 'Save')).toBe(true);
    });

    it('should map dynamic select to data_source_action', () => {
        const block = convertDialogElementToMmBlock({
            ...textElement,
            type: 'select',
            data_source: 'dynamic',
            data_source_url: 'https://example.com/lookup',
        });
        expect(block).toMatchObject({
            type: 'select',
            data_source: 'dynamic',
            data_source_action: 'name',
        });
    });

    it('should map textarea to multiline text_input', () => {
        const block = convertDialogElementToMmBlock({
            ...textElement,
            type: 'textarea',
        });
        expect(block).toMatchObject({type: 'text_input', multiline: true});
    });

    it('should map date, datetime, and file elements', () => {
        expect(convertDialogElementToMmBlock({
            ...textElement,
            name: 'due',
            display_name: 'Due',
            type: 'date',
            default: '2025-06-15',
            placeholder: 'Pick a date',
            datetime_config: {allow_manual_time_entry: true},
        })).toMatchObject({
            type: 'date_input',
            name: 'due',
            label: 'Due',
            initial_value: '2025-06-15',
            placeholder: 'Pick a date',
            datetime_config: {manual_time_entry: true},
        });

        expect(convertDialogElementToMmBlock({
            ...textElement,
            name: 'meeting',
            display_name: 'Meeting',
            type: 'datetime',
            default: '2025-06-15T10:00:00Z',
            datetime_config: {time_interval: 30},
        })).toMatchObject({
            type: 'datetime_input',
            name: 'meeting',
            label: 'Meeting',
            initial_value: '2025-06-15T10:00:00Z',
            datetime_config: {time_interval: 30},
        });

        expect(convertDialogElementToMmBlock({
            ...textElement,
            name: 'future',
            display_name: 'Future',
            type: 'date',
            min_date: 'today',
            time_interval: 60,
            datetime_config: {
                location_timezone: 'Europe/London',
                allow_manual_time_entry: true,
            },
        })).toMatchObject({
            type: 'date_input',
            datetime_config: {
                min_date: 'today',
                time_interval: 60,
                location_timezone: 'Europe/London',
                manual_time_entry: true,
            },
        });

        expect(convertDialogElementToMmBlock({
            ...textElement,
            name: 'attachments',
            display_name: 'Attachments',
            type: 'file',
            placeholder: 'Upload',
            allow_multiple: true,
        })).toMatchObject({
            type: 'file_input',
            name: 'attachments',
            label: 'Attachments',
            placeholder: 'Upload',
            allow_multiple: true,
        });
    });

    it('should convert action_button elements to execute buttons with dialog action query keys', () => {
        const block = convertDialogElementToMmBlock({
            ...textElement,
            name: 'do_thing',
            display_name: 'Do Thing',
            type: 'action_button',
            action_button: {url: '/plugins/foo/action', context: {some: 'value'}},
        });
        expect(block).toMatchObject({
            type: 'button',
            text: 'Do Thing',
            action_id: 'do_thing',
            subtype: 'execute',
            query: {
                __dialog_action_button: '1',
                __dialog_action_url: '/plugins/foo/action',
                some: 'value',
            },
        });
    });

    it('should keep the reserved action query keys when the context reuses them', () => {
        const block = convertDialogElementToMmBlock({
            ...textElement,
            name: 'do_thing',
            display_name: 'Do Thing',
            type: 'action_button',
            action_button: {
                url: '/plugins/foo/action',
                context: {__dialog_action_button: 'spoofed', __dialog_action_url: '/evil'},
            },
        });
        expect(block).toMatchObject({
            query: {
                __dialog_action_button: '1',
                __dialog_action_url: '/plugins/foo/action',
            },
        });
    });

    it('should omit footer submit chrome for action-button-only dialogs unless submit_label is set', () => {
        const elements: DialogElement[] = [{
            ...textElement,
            type: 'action_button',
            action_button: {url: '/plugins/foo/action'},
        }];
        const {blocks} = convertDialogToMmBlocks(elements, undefined);

        expect(blocks.some((b) => b.type === 'button' && 'action_id' in b && b.action_id === DIALOG_SUBMIT_ACTION_ID)).toBe(false);
        expect(blocks.some((b) => b.type === 'button')).toBe(true);
        expect(dialogShouldShowSubmitChrome(elements, undefined)).toBe(false);
        expect(dialogShouldShowSubmitChrome(elements, 'Save')).toBe(true);
    });

    it('should show footer submit chrome when there are no elements', () => {
        const {blocks} = convertDialogToMmBlocks(undefined, undefined);

        expect(blocks).toHaveLength(0);
        expect(dialogShouldShowSubmitChrome(undefined, undefined)).toBe(true);
    });

    it('should return null for elements without a name or type', () => {
        expect(convertDialogElementToMmBlock({...textElement, name: ''})).toBeNull();
        expect(convertDialogElementToMmBlock({...textElement, type: undefined as unknown as 'text'})).toBeNull();
    });

    it('should return null for unsupported element types', () => {
        expect(convertDialogElementToMmBlock({
            ...textElement,
            type: 'unsupported' as InteractiveDialogElementType,
        })).toBeNull();
    });

    it('should keep known text subtypes and fall back to text for unknown ones', () => {
        const subtypeOf = (subtype?: InteractiveDialogTextSubtype) => (
            convertDialogElementToMmBlock({...textElement, subtype}) as MmTextInputBlock
        ).subtype;

        expect(subtypeOf('email')).toBe('email');
        expect(subtypeOf('number')).toBe('number');
        expect(subtypeOf('password')).toBe('password');
        expect(subtypeOf('tel')).toBe('tel');
        expect(subtypeOf('url')).toBe('url');
        expect(subtypeOf('weird' as InteractiveDialogTextSubtype)).toBe('text');
        expect(subtypeOf(undefined)).toBeUndefined();
    });

    it('should parse bool defaults from booleans and truthy or falsy strings', () => {
        const initialValueOf = (value: string | boolean) => (
            convertDialogElementToMmBlock({...textElement, type: 'bool', default: value}) as MmBoolInputBlock
        ).initial_value;

        expect(initialValueOf(true)).toBe(true);
        expect(initialValueOf(false)).toBe(false);
        expect(initialValueOf('true')).toBe(true);
        expect(initialValueOf('YES')).toBe(true);
        expect(initialValueOf('1')).toBe(true);
        expect(initialValueOf('false')).toBe(false);
        expect(initialValueOf(' false ')).toBe(false);
        expect(initialValueOf('no')).toBe(false);
        expect(initialValueOf('0')).toBe(false);
        expect(initialValueOf('maybe')).toBeUndefined();
        expect(initialValueOf('')).toBeUndefined();
    });

    it('should ignore non-string defaults on string valued elements', () => {
        expect((convertDialogElementToMmBlock({
            ...textElement,
            default: true,
        }) as MmTextInputBlock).initial_value).toBeUndefined();
    });

    it('should omit options when a select has none', () => {
        expect((convertDialogElementToMmBlock({
            ...textElement,
            type: 'select',
            options: [],
        }) as MmSelectInputBlock).options).toBeUndefined();
    });

    it('should split the default of a multiselect into initial_options', () => {
        expect(convertDialogElementToMmBlock({
            ...textElement,
            type: 'select',
            multiselect: true,
            options: [{text: 'One', value: '1'}, {text: 'Two', value: '2'}],
            default: '1, 2, ',
        })).toMatchObject({
            type: 'select',
            multiselect: true,
            initial_option: undefined,
            initial_options: ['1', '2'],
        });
    });

    it('should map refresh elements to an onChange action and drop empty help text', () => {
        expect(convertDialogElementToMmBlock({
            ...textElement,
            refresh: true,
            help_text: '',
        })).toMatchObject({
            name: 'name',
            onChange: 'name',
            help_text: undefined,
        });
    });

    it('should omit empty optional fields for every element type', () => {
        const bare: DialogElement = {
            ...textElement,
            placeholder: '',
            help_text: '',
            default: '',
            min_length: 0,
            max_length: 0,
        };

        expect(convertDialogElementToMmBlock(bare)).toMatchObject({
            type: 'text_input',
            placeholder: undefined,
            initial_value: undefined,
            min_length: undefined,
            max_length: undefined,
        });
        expect(convertDialogElementToMmBlock({...bare, type: 'textarea'})).toMatchObject({
            multiline: true,
            placeholder: undefined,
            min_length: undefined,
            max_length: undefined,
        });
        expect(convertDialogElementToMmBlock({...bare, type: 'bool'})).toMatchObject({
            placeholder: undefined,
            initial_value: undefined,
        });
        expect(convertDialogElementToMmBlock({...bare, type: 'radio'})).toMatchObject({
            placeholder: undefined,
            initial_option: undefined,
        });
        expect(convertDialogElementToMmBlock({...bare, type: 'select'})).toMatchObject({
            placeholder: undefined,
            multiselect: undefined,
            data_source: undefined,
            data_source_action: undefined,
            initial_option: undefined,
            initial_options: undefined,
        });
        expect(convertDialogElementToMmBlock({...bare, type: 'date'})).toMatchObject({
            placeholder: undefined,
            datetime_config: undefined,
        });
        expect(convertDialogElementToMmBlock({...bare, type: 'datetime'})).toMatchObject({
            placeholder: undefined,
            datetime_config: undefined,
        });
        expect(convertDialogElementToMmBlock({...bare, type: 'file'})).toMatchObject({
            placeholder: undefined,
            allow_multiple: undefined,
        });
        expect(convertDialogElementToMmBlock({...bare, type: 'action_button'})).toMatchObject({
            query: {__dialog_action_button: '1'},
        });
    });

    it('should coerce option text and value to strings', () => {
        expect(convertDialogElementToMmBlock({
            ...textElement,
            type: 'radio',
            options: [{} as DialogOption],
        })).toMatchObject({options: [{text: '', value: ''}]});
    });

    it('should skip elements that cannot be converted', () => {
        const {blocks} = convertDialogToMmBlocks([{...textElement, name: ''}, textElement], undefined);

        expect(blocks).toEqual([
            expect.objectContaining({type: 'text_input', name: 'name'}),
        ]);
    });

    it('should label elements with their name when there is no display name', () => {
        expect(convertDialogElementToMmBlock({
            ...textElement,
            display_name: '',
        })).toMatchObject({label: 'name'});

        expect(convertDialogElementToMmBlock({
            ...textElement,
            display_name: '',
            type: 'action_button',
        })).toMatchObject({text: 'name', action_id: 'name'});
    });
});
