// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    checkMmBlocksFormFieldForError,
    collectMmBlocksFormFields,
    stripMmBlocksFormInputs,
    validateMmBlocksFormValues,
} from './form_validation';

describe('form_validation', () => {
    describe('collectMmBlocksFormFields', () => {
        it('should collect nested form fields', () => {
            const blocks: MmBlock[] = [
                {type: 'text', text: 'Intro'},
                {
                    type: 'container',
                    content: [
                        {type: 'text_input', name: 'title', label: 'Title'},
                        {
                            type: 'column_set',
                            columns: [{
                                type: 'column',
                                items: [
                                    {type: 'bool_input', name: 'notify', label: 'Notify', optional: true},
                                ],
                            }],
                        },
                    ],
                },
            ];

            expect(collectMmBlocksFormFields(blocks).map((f) => f.name)).toEqual(['title', 'notify']);
        });

        it('should collect fields from both the header and content of a collapsible', () => {
            const blocks: MmBlock[] = [{
                type: 'collapsible',
                header: [{type: 'text_input', name: 'summary', label: 'Summary'}],
                content: [
                    {type: 'divider'},
                    {type: 'select', name: 'role', label: 'Role'},
                ],
            }];

            expect(collectMmBlocksFormFields(blocks).map((f) => f.name)).toEqual(['summary', 'role']);
        });
    });

    describe('stripMmBlocksFormInputs', () => {
        it('should remove form input blocks and keep interactive controls', () => {
            const blocks: MmBlock[] = [
                {type: 'text', text: 'Intro'},
                {type: 'text_input', name: 'title', label: 'Title'},
                {type: 'button', text: 'Go', action_id: 'go'},
                {type: 'bool_input', name: 'notify', label: 'Notify'},
                {type: 'static_select', action_id: 'pick', placeholder: 'Pick'},
            ];

            expect(stripMmBlocksFormInputs(blocks)).toEqual([
                {type: 'text', text: 'Intro'},
                {type: 'button', text: 'Go', action_id: 'go'},
                {type: 'static_select', action_id: 'pick', placeholder: 'Pick'},
            ]);
        });

        it('should drop empty structural parents after stripping inputs', () => {
            const blocks: MmBlock[] = [
                {
                    type: 'container',
                    content: [
                        {type: 'text_input', name: 'title', label: 'Title'},
                        {type: 'text', text: 'Kept'},
                    ],
                },
                {
                    type: 'column_set',
                    columns: [{
                        type: 'column',
                        items: [{type: 'select', name: 'role', label: 'Role'}],
                    }],
                },
                {
                    type: 'collapsible',
                    header: [{type: 'text', text: 'Header'}],
                    content: [{type: 'date_input', name: 'due', label: 'Due'}],
                },
            ];

            expect(stripMmBlocksFormInputs(blocks)).toEqual([
                {type: 'container', content: [{type: 'text', text: 'Kept'}]},
            ]);
        });
    });

    describe('checkMmBlocksFormFieldForError', () => {
        it('should require non-optional empty fields', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'title', label: 'Title'},
                undefined,
            )?.id).toBe('interactive_dialog.error.required');
        });

        it('should treat null as an empty value', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'title', label: 'Title'},
                null,
            )?.id).toBe('interactive_dialog.error.required');
        });

        it('should allow optional fields to be empty', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'title', label: 'Title', optional: true},
                '',
            )).toBeNull();

            expect(checkMmBlocksFormFieldForError(
                {type: 'select', name: 'role', label: 'Role', optional: true},
                [],
            )).toBeNull();
        });

        it('should treat boolean false as a filled value', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'bool_input', name: 'notify', label: 'Notify'},
                false,
            )).toBeNull();

            expect(checkMmBlocksFormFieldForError(
                {type: 'bool_input', name: 'notify', label: 'Notify'},
                true,
            )).toBeNull();
        });

        it('should allow an unchecked optional bool field', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'bool_input', name: 'notify', label: 'Notify', optional: true},
                false,
            )).toBeNull();
        });

        it('should treat zero as a filled number and non-finite numbers as empty', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'count', label: 'Count', subtype: 'number'},
                0,
            )).toBeNull();

            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'count', label: 'Count', subtype: 'number'},
                NaN,
            )?.id).toBe('interactive_dialog.error.required');
        });

        it('should enforce min and max length on text', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'title', label: 'Title', min_length: 3},
                'ab',
            )?.id).toBe('interactive_dialog.error.too_short');

            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'title', label: 'Title', max_length: 3},
                'abcd',
            )?.id).toBe('interactive_dialog.error.too_long');
        });

        it('should validate email subtype', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'email', label: 'Email', subtype: 'email', optional: true},
                'not-an-email',
            )?.id).toBe('interactive_dialog.error.bad_email');
        });

        it('should validate the number and url subtypes', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'count', label: 'Count', subtype: 'number'},
                'abc',
            )?.id).toBe('interactive_dialog.error.bad_number');

            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'count', label: 'Count', subtype: 'number'},
                '42',
            )).toBeNull();

            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'site', label: 'Site', subtype: 'url'},
                'example.com',
            )?.id).toBe('interactive_dialog.error.bad_url');

            expect(checkMmBlocksFormFieldForError(
                {type: 'text_input', name: 'site', label: 'Site', subtype: 'url'},
                'https://example.com',
            )).toBeNull();
        });

        it('should reject values outside the select options', () => {
            const field: MmSelectInputBlock = {
                type: 'select',
                name: 'role',
                label: 'Role',
                options: [{text: 'Admin', value: 'admin'}],
                multiselect: true,
            };

            expect(checkMmBlocksFormFieldForError(field, ['admin'])).toBeNull();
            expect(checkMmBlocksFormFieldForError(field, ['admin', 'guest'])?.id).toBe('interactive_dialog.error.invalid_option');
        });

        it('should reject a single select value outside the options', () => {
            const field: MmSelectInputBlock = {
                type: 'select',
                name: 'role',
                label: 'Role',
                options: [{text: 'Admin', value: 'admin'}],
            };

            expect(checkMmBlocksFormFieldForError(field, 'admin')).toBeNull();
            expect(checkMmBlocksFormFieldForError(field, 'guest')?.id).toBe('interactive_dialog.error.invalid_option');
        });

        it('should accept any value when the select has no options to check', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'select', name: 'owner', label: 'Owner', data_source: 'users'},
                'user-id',
            )).toBeNull();
        });

        it('should validate date and datetime storage formats', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'date_input', name: 'due', label: 'Due'},
                '2026-07-30',
            )).toBeNull();

            expect(checkMmBlocksFormFieldForError(
                {type: 'date_input', name: 'due', label: 'Due'},
                '2026-07-30T10:00:00Z',
            )?.id).toBe('interactive_dialog.error.bad_date_format');

            // The mobile picker serializes with Moment.toISOString(), which includes milliseconds.
            expect(checkMmBlocksFormFieldForError(
                {type: 'datetime_input', name: 'start', label: 'Start'},
                '2026-07-30T10:00:00.000Z',
            )).toBeNull();
        });

        it('should enforce datetime_config bounds', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'datetime_input', name: 'start', label: 'Start', datetime_config: {min_date: '2026-08-01'}},
                '2026-07-30T10:00:00Z',
            )?.id).toBe('interactive_dialog.error.before_min_date');

            expect(checkMmBlocksFormFieldForError(
                {type: 'datetime_input', name: 'start', label: 'Start', datetime_config: {max_date: '2026-07-01'}},
                '2026-07-30T10:00:00Z',
            )?.id).toBe('interactive_dialog.error.after_max_date');
        });

        it('should skip date validation for values that are not strings', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'date_input', name: 'due', label: 'Due'},
                ['2026-07-30'],
            )).toBeNull();
        });

        it('should accept file values as a string or an array of ids', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'file_input', name: 'attachment', label: 'Attachment'},
                'file-1',
            )).toBeNull();

            expect(checkMmBlocksFormFieldForError(
                {type: 'file_input', name: 'attachment', label: 'Attachment'},
                ['file-1', 'file-2'],
            )).toBeNull();
        });

        it('should reject file values that are not ids', () => {
            expect(checkMmBlocksFormFieldForError(
                {type: 'file_input', name: 'attachment', label: 'Attachment'},
                true,
            )?.id).toBe('interactive_dialog.error.invalid_file');
        });
    });

    describe('validateMmBlocksFormValues', () => {
        it('should return errors keyed by field name', () => {
            const blocks: MmBlock[] = [
                {type: 'text_input', name: 'title', label: 'Title'},
                {type: 'select', name: 'role', label: 'Role', optional: true},
            ];

            expect(validateMmBlocksFormValues(blocks, {})).toEqual({
                title: expect.objectContaining({id: 'interactive_dialog.error.required'}),
            });
        });

        it('should ignore fields without a name', () => {
            const blocks: MmBlock[] = [{type: 'text_input', name: '', label: 'Title'}];

            expect(validateMmBlocksFormValues(blocks, {})).toEqual({});
        });
    });
});
