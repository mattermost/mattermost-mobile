// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {translateMMBlocks} from './mm_block';

describe('translateMMBlocks interactive blocks', () => {
    it('should accept form input blocks without a label except bool_input', () => {
        expect(translateMMBlocks([
            {type: 'text_input', name: 'title'},
            {type: 'bool_input', name: 'notify'},
            {type: 'bool_input', name: 'agree', label: '   '},
            {type: 'bool_input', name: 'enabled', label: 'Enabled'},
            {type: 'select', name: 'role', options: [{text: 'A', value: 'a'}]},
            {type: 'date_input', name: 'due'},
            {type: 'datetime_input', name: 'starts_at'},
            {type: 'file_input', name: 'attachment'},
        ])).toEqual([
            {type: 'text_input', name: 'title'},
            {type: 'bool_input', name: 'enabled', label: 'Enabled'},
            {type: 'select', name: 'role', options: [{text: 'A', value: 'a'}]},
            {type: 'date_input', name: 'due'},
            {type: 'datetime_input', name: 'starts_at'},
            {type: 'file_input', name: 'attachment'},
        ]);
    });

    it('should reject button blocks with empty text or action_id', () => {
        expect(translateMMBlocks([
            {type: 'button', text: '   ', action_id: 'ok'},
            {type: 'button', text: 'Go', action_id: ''},
        ])).toEqual([]);
    });

    it('should accept button blocks with non-empty text and action_id', () => {
        expect(translateMMBlocks([
            {type: 'button', text: 'Go', action_id: 'go_action'},
        ])).toEqual([{
            type: 'button',
            text: 'Go',
            action_id: 'go_action',
        }]);
    });

    it('should reject static_select blocks with empty placeholder or action_id', () => {
        expect(translateMMBlocks([
            {
                type: 'static_select',
                action_id: 'sel',
                placeholder: '  ',
                options: [{text: 'A', value: 'a'}],
            },
            {
                type: 'static_select',
                action_id: '   ',
                placeholder: 'Pick',
                options: [{text: 'A', value: 'a'}],
            },
        ])).toEqual([]);
    });

    it('should accept static_select blocks with non-empty placeholder and action_id', () => {
        expect(translateMMBlocks([
            {
                type: 'static_select',
                action_id: 'sel_action',
                placeholder: 'Pick one',
                options: [{text: 'A', value: 'a'}],
            },
        ])).toEqual([{
            type: 'static_select',
            action_id: 'sel_action',
            placeholder: 'Pick one',
            options: [{text: 'A', value: 'a'}],
        }]);
    });

    it('should reject datetime blocks with a non-positive time_interval', () => {
        const datetimeBlock = (timeInterval: unknown) => ({
            type: 'datetime_input',
            name: 'starts_at',
            label: 'Starts at',
            datetime_config: {time_interval: timeInterval},
        });

        expect(translateMMBlocks([datetimeBlock(0), datetimeBlock(-15)])).toEqual([]);
        expect(translateMMBlocks([datetimeBlock(15)])).toEqual([{
            type: 'datetime_input',
            name: 'starts_at',
            label: 'Starts at',
            datetime_config: {time_interval: 15},
        }]);
    });

    it('should accept column gap and reject invalid gap values', () => {
        expect(translateMMBlocks([
            {
                type: 'column',
                gap: 'small',
                items: [{type: 'text', text: 'In column'}],
            },
            {
                type: 'column',
                gap: 'invalid',
                items: [{type: 'text', text: 'Bad gap'}],
            },
        ])).toEqual([{
            type: 'column',
            gap: 'small',
            items: [{type: 'text', text: 'In column'}],
        }]);
    });

    it('should omit collapsed on collapsible blocks when the field is absent', () => {
        expect(translateMMBlocks([
            {
                type: 'collapsible',
                header: [{type: 'text', text: 'Header'}],
                content: [{type: 'text', text: 'Body'}],
            },
        ])).toEqual([{
            type: 'collapsible',
            header: [{type: 'text', text: 'Header'}],
            content: [{type: 'text', text: 'Body'}],
        }]);
    });

    it('should preserve explicit collapsed values on collapsible blocks', () => {
        expect(translateMMBlocks([
            {
                type: 'collapsible',
                collapsed: true,
                header: [{type: 'text', text: 'Header'}],
                content: [{type: 'text', text: 'Body'}],
            },
            {
                type: 'collapsible',
                collapsed: false,
                header: [{type: 'text', text: 'Open header'}],
                content: [{type: 'text', text: 'Open body'}],
            },
            {
                type: 'collapsible',
                collapsed: 'not-a-boolean',
                header: [{type: 'text', text: 'Bad header'}],
                content: [{type: 'text', text: 'Bad body'}],
            },
        ])).toEqual([
            {
                type: 'collapsible',
                collapsed: true,
                header: [{type: 'text', text: 'Header'}],
                content: [{type: 'text', text: 'Body'}],
            },
            {
                type: 'collapsible',
                collapsed: false,
                header: [{type: 'text', text: 'Open header'}],
                content: [{type: 'text', text: 'Open body'}],
            },
        ]);
    });

    it('should accept column_set gap and reject invalid gap values', () => {
        expect(translateMMBlocks([
            {
                type: 'column_set',
                gap: 'large',
                columns: [
                    {type: 'column', items: [{type: 'text', text: 'A'}]},
                    {type: 'column', items: [{type: 'text', text: 'B'}]},
                ],
            },
            {
                type: 'column_set',
                gap: 'huge',
                columns: [
                    {type: 'column', items: [{type: 'text', text: 'C'}]},
                ],
            },
        ])).toEqual([{
            type: 'column_set',
            gap: 'large',
            columns: [
                {type: 'column', items: [{type: 'text', text: 'A'}]},
                {type: 'column', items: [{type: 'text', text: 'B'}]},
            ],
        }]);
    });

    it('should preserve file_input initial_value from a string or string array', () => {
        expect(translateMMBlocks([
            {
                type: 'file_input',
                name: 'attachments',
                label: 'Attachments',
                initial_value: 'file-1,file-2',
            },
            {
                type: 'file_input',
                name: 'single',
                label: 'Single',
                initial_value: ['file-a', 'file-b'],
            },
            {
                type: 'file_input',
                name: 'plain',
                label: 'Plain',
            },
        ])).toEqual([
            {
                type: 'file_input',
                name: 'attachments',
                label: 'Attachments',
                initial_value: 'file-1,file-2',
            },
            {
                type: 'file_input',
                name: 'single',
                label: 'Single',
                initial_value: 'file-a,file-b',
            },
            {
                type: 'file_input',
                name: 'plain',
                label: 'Plain',
            },
        ]);
    });
});
