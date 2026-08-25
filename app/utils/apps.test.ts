// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {AppBindingLocations, AppCallResponseTypes, AppFieldTypes} from '@constants/apps';

import {
    cleanBinding,
    validateBindings,
    cleanForm,
    makeCallErrorResponse,
    filterEmptyOptions,
    createCallContext,
    createCallRequest,
    isAppBinding,
} from './apps';

describe('cleanBinding', () => {
    it('should return the binding unchanged if it is null', () => {
        expect(cleanBinding(null as any, AppBindingLocations.COMMAND)).toBeNull();
    });

    it('should handle default values for app_id, label, and location', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: '',
                    location: '',
                    label: '',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings![0].app_id).toBe('test_app');
        expect(result!.bindings![0].label).toBeTruthy();
        expect(result!.bindings![0].location).toMatch(/location\/.+/);
    });

    it('should remove bindings without app_id', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: '',
                    location: 'sub_location1',
                    label: 'sub_label1',
                },
                {
                    app_id: 'sub_app',
                    location: 'sub_location2',
                    label: 'sub_label2',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings).toHaveLength(1);
        expect(result!.bindings![0].app_id).toBe('sub_app');
    });

    it('should remove bindings with empty or whitespace labels', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: 'sub_app1',
                    location: 'sub_location1',
                    label: '',
                },
                {
                    app_id: 'sub_app2',
                    location: 'sub_location2',
                    label: '   ',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
                {
                    app_id: 'sub_app3',
                    location: 'sub_location3',
                    label: 'valid_label',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings).toHaveLength(1);
        expect(result!.bindings![0].label).toBe('valid_label');
    });

    it('should remove bindings with duplicate labels in COMMAND location', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: 'sub_app1',
                    location: 'sub_location1',
                    label: 'sub_label',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
                {
                    app_id: 'sub_app2',
                    location: 'sub_location2',
                    label: 'sub_label',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings).toHaveLength(1);
        expect(result!.bindings![0].app_id).toBe('sub_app1');
    });

    it('should keep unique labels in IN_POST location', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: 'sub_app1',
                    location: 'sub_location1',
                    label: 'sub_label1',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
                {
                    app_id: 'sub_app2',
                    location: 'sub_location2',
                    label: 'sub_label2',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.IN_POST);
        expect(result!.bindings).toHaveLength(2);
    });

    it('should remove invalid sub-bindings without form or submit', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: 'sub_app1',
                    location: 'sub_location1',
                    label: 'sub_label1',
                },
                {
                    app_id: 'sub_app2',
                    location: 'sub_location2',
                    label: 'sub_label2',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
                {
                    app_id: 'sub_app3',
                    location: 'sub_location3',
                    label: 'sub_label3',
                    submit: {
                        path: 'submit_path',
                    },
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings).toHaveLength(2);
        expect(result!.bindings![0].label).toBe('sub_label2');
        expect(result!.bindings![1].label).toBe('sub_label3');
    });

    it('should handle forms correctly', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: 'sub_app',
                    location: 'sub_location',
                    label: 'sub_label',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings).toHaveLength(1);
        expect(result!.bindings![0].form).toBeTruthy();
    });

    it('should handle submit calls correctly', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: 'sub_app',
                    location: 'sub_location',
                    label: 'sub_label',
                    submit: {
                        path: 'submit_path',
                    },
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings).toHaveLength(1);
        expect(result!.bindings![0].submit).toBeTruthy();
    });

    it('should recursively clean sub-bindings', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: 'sub_app',
                    location: 'sub_location',
                    label: 'sub_label',
                    bindings: [
                        {
                            app_id: '',
                            location: 'sub_sub_location1',
                            label: '',
                        },
                        {
                            app_id: 'sub_sub_app',
                            location: 'sub_sub_location2',
                            label: 'sub_sub_label',
                            form: {
                                submit: {
                                    path: 'submit_path',
                                },
                            },
                        },
                    ],
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings).toHaveLength(1);
        expect(result!.bindings![0].bindings).toHaveLength(1);
        expect(result!.bindings![0].bindings![0].label).toBe('sub_sub_label');
    });

    it('should handle bindings without bindings, form, or submit', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: 'sub_app',
                    location: 'sub_location',
                    label: 'sub_label',
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings).toHaveLength(0);
    });

    it('should handle multiple levels of nested bindings correctly', () => {
        const binding: AppBinding = {
            app_id: 'test_app',
            location: 'location',
            label: 'label',
            bindings: [
                {
                    app_id: 'sub_app1',
                    location: 'sub_location1',
                    label: 'sub_label1',
                    bindings: [
                        {
                            app_id: '',
                            location: 'sub_sub_location1',
                            label: '',
                        },
                        {
                            app_id: 'sub_sub_app',
                            location: 'sub_sub_location2',
                            label: 'sub_sub_label',
                            form: {
                                submit: {
                                    path: 'submit_path',
                                },
                            },
                        },
                    ],
                },
                {
                    app_id: 'sub_app2',
                    location: 'sub_location2',
                    label: 'sub_label2',
                    form: {
                        submit: {
                            path: 'submit_path',
                        },
                    },
                },
            ],
        };

        const result = cleanBinding(binding, AppBindingLocations.COMMAND);
        expect(result!.bindings).toHaveLength(2);
        expect(result!.bindings![0].bindings).toHaveLength(1);
        expect(result!.bindings![0].bindings![0].label).toBe('sub_sub_label');
        expect(result!.bindings![1].label).toBe('sub_label2');
    });
});

describe('validateBindings', () => {
    it('should return an empty array if no bindings are provided', () => {
        expect(validateBindings()).toEqual([]);
    });

    it('should filter and clean bindings by their locations', () => {
        const bindings: AppBinding[] = [
            {app_id: '1', location: AppBindingLocations.CHANNEL_HEADER_ICON, label: 'channel_header', bindings: []},
            {app_id: '2', location: AppBindingLocations.POST_MENU_ITEM, label: 'post_menu', bindings: []},
            {app_id: '3', location: AppBindingLocations.COMMAND, label: 'command', bindings: []},
            {app_id: '4', location: 'other', label: 'other', bindings: []},
        ];

        const result = validateBindings(bindings);
        expect(result).toEqual([]);
    });

    it('should return only bindings that have sub-bindings after cleaning', () => {
        const bindings: AppBinding[] = [
            {app_id: '1', location: AppBindingLocations.CHANNEL_HEADER_ICON, label: 'channel_header', bindings: []},
            {app_id: '2',
                location: AppBindingLocations.POST_MENU_ITEM,
                label: 'post_menu',
                bindings: [{
                    app_id: '2.1',
                    label: 'sub_binding',
                    location: '',
                    form: {
                        submit: {
                            path: 'path_2',
                        },
                    },
                }]},
            {app_id: '3',
                location: AppBindingLocations.COMMAND,
                label: 'command',
                bindings: [{
                    app_id: '3.1',
                    label: 'sub_binding',
                    location: '',
                    form: {
                        submit: {
                            path: 'path_3',
                        },
                    },
                }]},
        ];

        const result = validateBindings(bindings);
        expect(result).toHaveLength(2);
        expect(result[0].app_id).toBe('2');
        expect(result[1].app_id).toBe('3');
    });

    it('should filter out bindings that do not have sub-bindings after cleaning', () => {
        const bindings: AppBinding[] = [
            {app_id: '1',
                location: AppBindingLocations.CHANNEL_HEADER_ICON,
                label: 'channel_header',
                bindings: [{
                    app_id: '1.1',
                    label: 'sub_binding',
                    location: '',
                }]},
            {app_id: '2', location: AppBindingLocations.POST_MENU_ITEM, label: 'post_menu', bindings: []},
            {app_id: '3', location: AppBindingLocations.COMMAND, label: 'command', bindings: []},
        ];

        const result = validateBindings(bindings);
        expect(result).toEqual([]);
    });

    it('should handle bindings with various sub-bindings and forms correctly', () => {
        const bindings: AppBinding[] = [
            {
                app_id: '1',
                location: AppBindingLocations.CHANNEL_HEADER_ICON,
                label: 'channel_header',
                bindings: [{
                    app_id: '1.1',
                    label: 'sub_binding1',
                    location: '',
                    form: {
                        submit: {
                            path: 'path_1',
                        },
                    },
                }]},
            {
                app_id: '2',
                location: AppBindingLocations.POST_MENU_ITEM,
                label: 'post_menu',
                bindings: [{
                    app_id: '2.1',
                    label: 'sub_binding2',
                    location: '',
                    form: {
                        submit: {
                            path: 'path_2',
                        },
                    },
                }]},
            {app_id: '3', location: AppBindingLocations.COMMAND, label: 'command', bindings: []},
        ];

        const result = validateBindings(bindings);
        expect(result).toHaveLength(2);
        expect(result[0].app_id).toBe('2');
        expect(result[1].app_id).toBe('1');
    });
});

describe('cleanForm', () => {
    it('should return immediately if form is undefined', () => {
        expect(() => cleanForm(undefined)).not.toThrow();
    });

    it('should remove fields without names', () => {
        const form: AppForm = {
            fields: [
                {name: '', type: 'text'} as AppField,
                {name: 'valid_name', type: 'text'} as AppField,
            ],
        };

        cleanForm(form);
        expect(form.fields).toHaveLength(1);
        expect(form.fields![0].name).toBe('valid_name');
    });

    it('should remove fields with names containing spaces or tabs', () => {
        const form: AppForm = {
            fields: [
                {name: 'invalid name', type: 'text'} as AppField,
                {name: 'invalid\tname', type: 'text'} as AppField,
                {name: 'valid_name', type: 'text'} as AppField,
            ],
        };

        cleanForm(form);
        expect(form.fields).toHaveLength(1);
        expect(form.fields![0].name).toBe('valid_name');
    });

    it('should remove fields with duplicate or invalid labels', () => {
        const form: AppForm = {
            fields: [
                {name: 'name1', type: 'text', label: 'label1'} as AppField,
                {name: 'name2', type: 'text', label: 'label1'} as AppField, // Duplicate label
                {name: 'name3', type: 'text', label: 'invalid label'} as AppField,
                {name: 'name4', type: 'text'} as AppField, // No label, should use name
                {name: 'name5', type: 'text', label: 'label5'} as AppField,
            ],
        };

        cleanForm(form);
        expect(form.fields).toHaveLength(3);
        expect(form.fields![0].name).toBe('name1');
        expect(form.fields![1].name).toBe('name4');
        expect(form.fields![2].name).toBe('name5');
    });

    it('should handle STATIC_SELECT fields and remove invalid options', () => {
        const form: AppForm = {
            fields: [
                {
                    name: 'select_field',
                    type: AppFieldTypes.STATIC_SELECT,
                    options: [
                        {label: 'option1', value: 'value1'},
                        {label: '', value: 'value2'},
                        {label: 'option1', value: 'value3'},
                        {label: 'option4', value: ''},
                    ],
                } as AppField,
            ],
        };

        cleanForm(form);
        expect(form.fields).toHaveLength(1);
        expect(form.fields![0].options).toHaveLength(3);
    });

    it('should retain valid fields and options', () => {
        const form: AppForm = {
            fields: [
                {name: 'valid_name', type: 'text'} as AppField,
                {
                    name: 'select_field',
                    type: AppFieldTypes.STATIC_SELECT,
                    options: [
                        {label: 'option1', value: 'value1'},
                        {label: 'option2', value: 'value2'},
                    ],
                } as AppField,
                {name: 'dynamic_field_with_lookup', type: AppFieldTypes.DYNAMIC_SELECT, lookup: {path: 'lookup_path'}} as AppField,
            ],
        };

        cleanForm(form);
        expect(form.fields).toHaveLength(3);
    });
});

describe('makeCallErrorResponse', () => {
    it('should create an error response object', () => {
        const errorMessage = 'An error occurred';
        const errorResponse = makeCallErrorResponse(errorMessage);

        expect(errorResponse.type).toBe(AppCallResponseTypes.ERROR);
        expect(errorResponse.text).toBe(errorMessage);
    });
});

describe('filterEmptyOptions', () => {
    it('should filter out empty options', () => {
        const options: AppSelectOption[] = [
            {label: 'Option 1', value: 'value1'},
            {label: 'Option 2', value: ' '},
            {label: 'Option 3', value: ''},
            {label: 'Option 4', value: 'value2'},
        ];

        const filteredOptions = options.filter(filterEmptyOptions);

        // Check that empty options have been filtered out
        expect(filteredOptions.length).toBe(2);
        expect(filteredOptions.map((option) => option.label)).toEqual(['Option 1', 'Option 4']);
    });
});

describe('createCallContext', () => {
    it('should create context with all parameters provided', () => {
        const context = createCallContext('appID123', 'location123', 'channelID123', 'teamID123', 'postID123', 'rootID123');

        expect(context).toEqual({
            app_id: 'appID123',
            location: 'location123',
            channel_id: 'channelID123',
            team_id: 'teamID123',
            post_id: 'postID123',
            root_id: 'rootID123',
        });
    });

    it('should create context with only appID provided', () => {
        const context = createCallContext('appID123');

        expect(context).toEqual({
            app_id: 'appID123',
            location: undefined,
            channel_id: undefined,
            team_id: undefined,
            post_id: undefined,
            root_id: undefined,
        });
    });

    it('should create context with some parameters provided', () => {
        const context = createCallContext('appID123', 'location123', 'channelID123');

        expect(context).toEqual({
            app_id: 'appID123',
            location: 'location123',
            channel_id: 'channelID123',
            team_id: undefined,
            post_id: undefined,
            root_id: undefined,
        });
    });
});

describe('createCallRequest', () => {
    const mockAppCall: AppCall = {
        path: '/mock/path',
        expand: {
            app: 'all',
        },
    };

    const mockAppContext: AppContext = {
        app_id: 'appID123',
        location: 'location123',
        channel_id: 'channelID123',
        team_id: 'teamID123',
        post_id: 'postID123',
        root_id: 'rootID123',
    };

    const mockDefaultExpand: AppExpand = {
        user: 'all',
        post: 'none',
    };

    const mockValues: AppCallValues = {
        key1: 'value1',
        key2: 'value2',
    };

    it('should create call request with all parameters provided', () => {
        const rawCommand = '/mock command';
        const request = createCallRequest(mockAppCall, mockAppContext, mockDefaultExpand, mockValues, rawCommand);

        expect(request).toEqual({
            ...mockAppCall,
            context: mockAppContext,
            values: mockValues,
            expand: {
                ...mockDefaultExpand,
                ...mockAppCall.expand,
            },
            raw_command: rawCommand,
        });
    });

    it('should create call request with required parameters only', () => {
        const request = createCallRequest(mockAppCall, mockAppContext);

        expect(request).toEqual({
            ...mockAppCall,
            context: mockAppContext,
            expand: {
                ...mockAppCall.expand,
            },
            values: undefined,
            raw_command: undefined,
        });
    });

    it('should create call request with default expand only', () => {
        const request = createCallRequest(mockAppCall, mockAppContext, mockDefaultExpand);

        expect(request).toEqual({
            ...mockAppCall,
            context: mockAppContext,
            expand: {
                ...mockDefaultExpand,
                ...mockAppCall.expand,
            },
            values: undefined,
            raw_command: undefined,
        });
    });

    it('should create call request with values only', () => {
        const request = createCallRequest(mockAppCall, mockAppContext, {}, mockValues);

        expect(request).toEqual({
            ...mockAppCall,
            context: mockAppContext,
            expand: {
                ...mockAppCall.expand,
            },
            values: mockValues,
            raw_command: undefined,
        });
    });

    it('should create call request with raw command only', () => {
        const rawCommand = '/mock command';
        const request = createCallRequest(mockAppCall, mockAppContext, {}, undefined, rawCommand);

        expect(request).toEqual({
            ...mockAppCall,
            context: mockAppContext,
            expand: {
                ...mockAppCall.expand,
            },
            values: undefined,
            raw_command: rawCommand,
        });
    });

    it('should create call request with overridden expand values', () => {
        const callWithExpandOverride: AppCall = {
            ...mockAppCall,
            expand: {
                app: 'none',
                user: 'summary',
            },
        };
        const request = createCallRequest(callWithExpandOverride, mockAppContext, mockDefaultExpand);

        expect(request).toEqual({
            ...callWithExpandOverride,
            context: mockAppContext,
            expand: {
                ...mockDefaultExpand,
                ...callWithExpandOverride.expand,
            },
            values: undefined,
            raw_command: undefined,
        });
    });
});

describe('isAppBinding', () => {
    it('should return false for null', () => {
        expect(isAppBinding(null)).toBe(false);
    });

    it('should return false for non-object', () => {
        expect(isAppBinding('string')).toBe(false);
        expect(isAppBinding(42)).toBe(false);
    });

    it('should return true for empty object', () => {
        expect(isAppBinding({})).toBe(true);
    });

    it('should return true for valid binding with string fields', () => {
        expect(isAppBinding({
            app_id: 'app1',
            label: 'My Binding',
            location: '/command',
            icon: 'icon.png',
            hint: 'hint text',
            description: 'desc',
            role_id: 'role1',
        })).toBe(true);
    });

    it('should return false when app_id is not a string', () => {
        expect(isAppBinding({app_id: 123})).toBe(false);
    });

    it('should return false when label is not a string', () => {
        expect(isAppBinding({label: true})).toBe(false);
    });

    it('should return false when location is not a string', () => {
        expect(isAppBinding({location: {}})).toBe(false);
    });

    it('should return false when depends_on_team is not a boolean', () => {
        expect(isAppBinding({depends_on_team: 'yes'})).toBe(false);
    });

    it('should return false when depends_on_channel is not a boolean', () => {
        expect(isAppBinding({depends_on_channel: 1})).toBe(false);
    });

    it('should return false when depends_on_user is not a boolean', () => {
        expect(isAppBinding({depends_on_user: 'true'})).toBe(false);
    });

    it('should return false when depends_on_post is not a boolean', () => {
        expect(isAppBinding({depends_on_post: 0})).toBe(false);
    });

    it('should return true for binding with valid nested bindings', () => {
        expect(isAppBinding({
            bindings: [{app_id: 'app1', label: 'sub', submit: {path: '/do'}}],
        })).toBe(true);
    });

    it('should return false when bindings contains invalid entry', () => {
        expect(isAppBinding({bindings: [{app_id: 123}]})).toBe(false);
    });

    it('should return true for binding with valid submit call', () => {
        expect(isAppBinding({submit: {path: '/submit'}})).toBe(true);
    });

    it('should return false when submit has invalid expand', () => {
        expect(isAppBinding({submit: {expand: {app: 123}}})).toBe(false);
    });

    it('should return false when submit.path is not a string', () => {
        expect(isAppBinding({submit: {path: 42}})).toBe(false);
    });

    it('should return true for binding with valid form', () => {
        expect(isAppBinding({
            form: {
                title: 'My Form',
                submit: {path: '/submit'},
                fields: [
                    {name: 'field1', type: 'text', is_required: true, readonly: false},
                ],
            },
        })).toBe(true);
    });

    it('should return false when form has invalid title type', () => {
        expect(isAppBinding({form: {title: 123}})).toBe(false);
    });

    it('should return false when form has invalid header type', () => {
        expect(isAppBinding({form: {header: false}})).toBe(false);
    });

    it('should return false when form has invalid footer type', () => {
        expect(isAppBinding({form: {footer: []}})).toBe(false);
    });

    it('should return false when form has invalid icon type', () => {
        expect(isAppBinding({form: {icon: 0}})).toBe(false);
    });

    it('should return false when form has invalid submit_buttons type', () => {
        expect(isAppBinding({form: {submit_buttons: true}})).toBe(false);
    });

    it('should return false when form has invalid cancel_button type', () => {
        expect(isAppBinding({form: {cancel_button: 'yes'}})).toBe(false);
    });

    it('should return false when form has invalid submit_on_cancel type', () => {
        expect(isAppBinding({form: {submit_on_cancel: 1}})).toBe(false);
    });

    it('should return false when form.fields contains invalid field', () => {
        expect(isAppBinding({form: {fields: [{name: 123}]}})).toBe(false);
    });

    it('should return false when form.source is invalid call', () => {
        expect(isAppBinding({form: {source: {path: 99}}})).toBe(false);
    });

    it('should return false when form.submit is invalid call', () => {
        expect(isAppBinding({form: {submit: {path: false}}})).toBe(false);
    });

    it('should return false when form.depends_on is not string array', () => {
        expect(isAppBinding({form: {depends_on: [1, 2]}})).toBe(false);
    });

    it('should return false when field.is_required is not boolean', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', is_required: 'yes'}]}})).toBe(false);
    });

    it('should return false when field.readonly is not boolean', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', readonly: 1}]}})).toBe(false);
    });

    it('should return false when field.position is not number', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', position: 'first'}]}})).toBe(false);
    });

    it('should return false when field.modal_label is not string', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', modal_label: true}]}})).toBe(false);
    });

    it('should return false when field.refresh is not boolean', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', refresh: 'true'}]}})).toBe(false);
    });

    it('should return false when field.multiselect is not boolean', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', multiselect: 1}]}})).toBe(false);
    });

    it('should return false when field.subtype is not string', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', subtype: 5}]}})).toBe(false);
    });

    it('should return false when field.min_length is not number', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', min_length: '5'}]}})).toBe(false);
    });

    it('should return false when field.max_length is not number', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', max_length: true}]}})).toBe(false);
    });

    it('should return false when field.options contains invalid option', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', options: [{label: 123}]}]}})).toBe(false);
    });

    it('should return false when field.lookup is invalid call', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', lookup: {expand: {app: 99}}}]}})).toBe(false);
    });

    it('should return true for field with valid static select options', () => {
        expect(isAppBinding({
            form: {
                fields: [{
                    name: 'color',
                    options: [{label: 'Red', value: 'red', icon_data: 'icon'}],
                }],
            },
        })).toBe(true);
    });

    it('should return false when option.label is not string', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', options: [{label: 1, value: 'v'}]}]}})).toBe(false);
    });

    it('should return false when option.value is not string', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', options: [{value: true}]}]}})).toBe(false);
    });

    it('should return false when option.icon_data is not string', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', options: [{value: 'v', icon_data: 5}]}]}})).toBe(false);
    });

    it('should return true for field value as string', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', value: 'hello'}]}})).toBe(true);
    });

    it('should return true for field value as boolean', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', value: true}]}})).toBe(true);
    });

    it('should return true for field value as null', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', value: null}]}})).toBe(true);
    });

    it('should return true for field value as valid AppSelectOption', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', value: {label: 'opt', value: 'v'}}]}})).toBe(true);
    });

    it('should return false for field value as invalid object', () => {
        expect(isAppBinding({form: {fields: [{name: 'f', value: {label: 123}}]}})).toBe(false);
    });
});

