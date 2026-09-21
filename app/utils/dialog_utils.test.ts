// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppFieldTypes} from '@constants/apps';

import {
    isAppSelectOption,
    DialogDataSources,
    DialogElementTypes,
    DialogTextSubtypes,
    mapDialogTypeToAppFieldType,
    mapAppFieldTypeToDialogType,
    getDataSourceForAppFieldType,
    createDialogElement,
    createAppField,
    supportsOptions,
    supportsDataSource,
    flattenAppFields,
    flattenDialogElements,
    flattenCollapsible,
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

        it('should map date and datetime types correctly', () => {
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.DATE)).toBe('date');
            expect(mapDialogTypeToAppFieldType(DialogElementTypes.DATETIME)).toBe('datetime');
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

        it('should map date and datetime types correctly', () => {
            expect(mapAppFieldTypeToDialogType('date')).toBe(DialogElementTypes.DATE);
            expect(mapAppFieldTypeToDialogType('datetime')).toBe(DialogElementTypes.DATETIME);
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
            expect(getDataSourceForAppFieldType('date')).toBeUndefined();
            expect(getDataSourceForAppFieldType('datetime')).toBeUndefined();
        });

        it('should return dynamic for dynamic_select type', () => {
            expect(getDataSourceForAppFieldType('dynamic_select')).toBe('dynamic');
        });

        it('should return correct data source for dynamic_select', () => {
            expect(getDataSourceForAppFieldType('dynamic_select')).toBe('dynamic');
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

    });

    describe('flattenAppFields', () => {
        it('returns flat fields unchanged', () => {
            const fields: AppField[] = [
                {name: 'name', type: 'text'},
                {name: 'email', type: 'text'},
            ] as AppField[];

            expect(flattenAppFields(fields)).toEqual(fields);
        });

        it('replaces a collapsible container with its child fields', () => {
            const email: AppField = {name: 'email', type: 'text'} as AppField;
            const phone: AppField = {name: 'phone', type: 'text'} as AppField;
            const fields: AppField[] = [
                {name: 'name', type: 'text'} as AppField,
                {
                    name: 'contact_section',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {fields: [email, phone]},
                } as AppField,
            ];

            const result = flattenAppFields(fields);
            expect(result).toHaveLength(3);
            expect(result.map((f) => f.name)).toEqual(['name', 'email', 'phone']);
        });

        it('recursively flattens nested collapsible sections', () => {
            const inner: AppField = {name: 'notes', type: 'text'} as AppField;
            const fields: AppField[] = [
                {
                    name: 'outer',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {
                        fields: [
                            {
                                name: 'inner',
                                type: AppFieldTypes.COLLAPSIBLE,
                                collapsible_config: {fields: [inner]},
                            } as AppField,
                        ],
                    },
                } as AppField,
            ];

            const result = flattenAppFields(fields);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('notes');
        });

        it('returns an empty array for an empty input', () => {
            expect(flattenAppFields([])).toEqual([]);
        });
    });

    describe('flattenAppFields (extended)', () => {
        it('returns an equal-but-distinct array (does not mutate input) when there are no collapsibles', () => {
            const fields: AppField[] = [
                {name: 'a', type: 'text'},
                {name: 'b', type: 'text'},
            ] as AppField[];
            const snapshot = JSON.parse(JSON.stringify(fields));

            const result = flattenAppFields(fields);

            // Same contents...
            expect(result).toEqual(fields);

            // ...but flatMap always allocates a new array, so callers can safely retain it.
            expect(result).not.toBe(fields);

            // The original input is untouched.
            expect(fields).toEqual(snapshot);
        });

        it('does not mutate the input tree when flattening collapsibles', () => {
            const fields: AppField[] = [
                {
                    name: 'outer',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {
                        fields: [
                            {name: 'inner_text', type: 'text'} as AppField,
                            {
                                name: 'inner_section',
                                type: AppFieldTypes.COLLAPSIBLE,
                                collapsible_config: {fields: [{name: 'deep', type: 'text'} as AppField]},
                            } as AppField,
                        ],
                    },
                } as AppField,
            ];
            const snapshot = JSON.parse(JSON.stringify(fields));

            flattenAppFields(fields);

            expect(fields).toEqual(snapshot);
        });

        it('preserves leaf ordering across a mixture of normal and collapsible fields', () => {
            const fields: AppField[] = [
                {name: 'before', type: 'text'} as AppField,
                {
                    name: 'section_1',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {fields: [{name: 's1a', type: 'text'} as AppField, {name: 's1b', type: 'text'} as AppField]},
                } as AppField,
                {name: 'between', type: 'text'} as AppField,
                {
                    name: 'section_2',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {fields: [{name: 's2a', type: 'text'} as AppField]},
                } as AppField,
                {name: 'after', type: 'text'} as AppField,
            ];

            expect(flattenAppFields(fields).map((f) => f.name)).toEqual(
                ['before', 's1a', 's1b', 'between', 's2a', 'after'],
            );
        });

        it('flattens multiple sibling collapsibles at the same level', () => {
            const fields: AppField[] = [
                {
                    name: 'sec_a',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {fields: [{name: 'a1', type: 'text'} as AppField]},
                } as AppField,
                {
                    name: 'sec_b',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {fields: [{name: 'b1', type: 'text'} as AppField]},
                } as AppField,
            ];

            expect(flattenAppFields(fields).map((f) => f.name)).toEqual(['a1', 'b1']);
        });

        it('drops a collapsible with no collapsible_config (treated as an empty section)', () => {
            const fields: AppField[] = [
                {name: 'keep', type: 'text'} as AppField,
                {name: 'broken_section', type: AppFieldTypes.COLLAPSIBLE} as AppField,
            ];

            // A collapsible container is never itself a leaf; with no children it contributes nothing.
            expect(flattenAppFields(fields).map((f) => f.name)).toEqual(['keep']);
        });

        it('drops a collapsible whose fields array is missing or empty', () => {
            const fields: AppField[] = [
                {name: 'empty_a', type: AppFieldTypes.COLLAPSIBLE, collapsible_config: {}} as AppField,
                {name: 'empty_b', type: AppFieldTypes.COLLAPSIBLE, collapsible_config: {fields: []}} as AppField,
            ];

            expect(flattenAppFields(fields)).toEqual([]);
        });

        it('drops nested empty sections but keeps their leaf siblings', () => {
            const fields: AppField[] = [
                {
                    name: 'outer',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {
                        fields: [
                            {name: 'empty_inner', type: AppFieldTypes.COLLAPSIBLE, collapsible_config: {fields: []}} as AppField,
                            {name: 'kept', type: 'text'} as AppField,
                        ],
                    },
                } as AppField,
            ];

            expect(flattenAppFields(fields).map((f) => f.name)).toEqual(['kept']);
        });

        it('never includes the collapsible container fields themselves', () => {
            const fields: AppField[] = [
                {
                    name: 'container',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {fields: [{name: 'leaf', type: 'text'} as AppField]},
                } as AppField,
            ];

            const names = flattenAppFields(fields).map((f) => f.name);
            expect(names).not.toContain('container');
            expect(names.every((_, i) => flattenAppFields(fields)[i].type !== AppFieldTypes.COLLAPSIBLE)).toBe(true);
        });

        it('flattens arbitrary recursion depth', () => {
            // Build outer -> ... -> leaf without hard-coding a specific depth in assertions.
            const DEPTH = 6;
            let node: AppField = {name: 'leaf', type: 'text'} as AppField;
            for (let level = DEPTH; level > 0; level--) {
                node = {
                    name: `level_${level}`,
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {fields: [node]},
                } as AppField;
            }

            const result = flattenAppFields([node]);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('leaf');
        });
    });

    describe('flattenDialogElements', () => {
        it('replaces a collapsible element with its child elements', () => {
            const emailEl: DialogElement = {name: 'email', type: 'text'} as DialogElement;
            const phoneEl: DialogElement = {name: 'phone', type: 'text'} as DialogElement;
            const elements: DialogElement[] = [
                {name: 'name', type: 'text'} as DialogElement,
                {
                    name: 'contact_section',
                    type: DialogElementTypes.COLLAPSIBLE,
                    collapsible_config: {elements: [emailEl, phoneEl]},
                } as DialogElement,
            ];

            const result = flattenDialogElements(elements);
            expect(result).toHaveLength(3);
            expect(result.map((e) => e.name)).toEqual(['name', 'email', 'phone']);
        });

        it('returns an empty array for an empty input', () => {
            expect(flattenDialogElements([])).toEqual([]);
        });

        it('leaves a collapsible-free list unchanged (equal, new array)', () => {
            const elements: DialogElement[] = [
                {name: 'a', type: 'text'} as DialogElement,
                {name: 'b', type: 'select'} as DialogElement,
            ];

            const result = flattenDialogElements(elements);
            expect(result).toEqual(elements);
            expect(result).not.toBe(elements);
        });

        it('recursively flattens nested collapsible elements and preserves ordering', () => {
            const elements: DialogElement[] = [
                {name: 'top', type: 'text'} as DialogElement,
                {
                    name: 'outer',
                    type: DialogElementTypes.COLLAPSIBLE,
                    collapsible_config: {
                        elements: [
                            {name: 'mid', type: 'text'} as DialogElement,
                            {
                                name: 'inner',
                                type: DialogElementTypes.COLLAPSIBLE,
                                collapsible_config: {elements: [{name: 'deep', type: 'text'} as DialogElement]},
                            } as DialogElement,
                        ],
                    },
                } as DialogElement,
            ];

            expect(flattenDialogElements(elements).map((e) => e.name)).toEqual(['top', 'mid', 'deep']);
        });

        it('drops collapsibles that lack collapsible_config or elements', () => {
            const elements: DialogElement[] = [
                {name: 'keep', type: 'text'} as DialogElement,
                {name: 'no_config', type: DialogElementTypes.COLLAPSIBLE} as DialogElement,
                {name: 'no_elements', type: DialogElementTypes.COLLAPSIBLE, collapsible_config: {}} as DialogElement,
            ];

            expect(flattenDialogElements(elements).map((e) => e.name)).toEqual(['keep']);
        });

        it('does not mutate the input tree', () => {
            const elements: DialogElement[] = [
                {
                    name: 'outer',
                    type: DialogElementTypes.COLLAPSIBLE,
                    collapsible_config: {elements: [{name: 'deep', type: 'text'} as DialogElement]},
                } as DialogElement,
            ];
            const snapshot = JSON.parse(JSON.stringify(elements));

            flattenDialogElements(elements);

            expect(elements).toEqual(snapshot);
        });
    });

    describe('flattenCollapsible (generic)', () => {
        type Node = {id: string; kids?: Node[]; group?: boolean};
        const isGroup = (n: Node) => Boolean(n.group);
        const getKids = (n: Node) => n.kids;

        it('returns leaves for a mixed tree and treats a group with no children as contributing nothing', () => {
            const nodes: Node[] = [
                {id: 'a'},
                {id: 'g1', group: true, kids: [{id: 'b'}, {id: 'c'}]},
                {id: 'g_empty', group: true},
                {id: 'd'},
            ];

            expect(flattenCollapsible(nodes, isGroup, getKids).map((n) => n.id)).toEqual(['a', 'b', 'c', 'd']);
        });

        it('returns an empty array for empty input', () => {
            expect(flattenCollapsible<Node>([], isGroup, getKids)).toEqual([]);
        });
    });
});
