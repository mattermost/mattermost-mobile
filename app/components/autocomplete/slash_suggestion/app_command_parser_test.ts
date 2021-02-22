// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import thunk from 'redux-thunk';
import configureStore from 'redux-mock-store';

import {Client4} from 'mattermost-redux/client';

import {AppBinding, AppForm} from 'mattermost-redux/types/apps';
import {AppFieldTypes} from 'mattermost-redux/constants/apps';

import {AppCommandParser, ParseState, ParsedCommand} from './app_command_parser';

const mockStore = configureStore([thunk]);

const reduxTestState = {
    entities: {
        channels: {
            currentChannelId: 'current_channel_id',
            myMembers: {
                current_channel_id: {
                    channel_id: 'current_channel_id',
                    user_id: 'current_user_id',
                    roles: 'channel_role',
                    mention_count: 1,
                    msg_count: 9,
                },
            },
            channels: {
                current_channel_id: {
                    id: 'current_channel_id',
                    name: 'default-name',
                    display_name: 'Default',
                    delete_at: 0,
                    type: 'O',
                    total_msg_count: 10,
                    team_id: 'team_id',
                },
                current_user_id__existingId: {
                    id: 'current_user_id__existingId',
                    name: 'current_user_id__existingId',
                    display_name: 'Default',
                    delete_at: 0,
                    type: '0',
                    total_msg_count: 0,
                    team_id: 'team_id',
                },
            },
            channelsInTeam: {
                'team-id': ['current_channel_id'],
            },
        },
        teams: {
            currentTeamId: 'team-id',
            teams: {
                'team-id': {
                    id: 'team_id',
                    name: 'team-1',
                    displayName: 'Team 1',
                },
            },
            myMembers: {
                'team-id': {roles: 'team_role'},
            },
        },
        users: {
            currentUserId: 'current_user_id',
            profiles: {
                current_user_id: {roles: 'system_role'},
            },
        },
        preferences: {
            myPreferences: {
                'display_settings--name_format': {
                    category: 'display_settings',
                    name: 'name_format',
                    user_id: 'current_user_id',
                    value: 'username',
                },
            },
        },
        roles: {
            roles: {
                system_role: {
                    permissions: [],
                },
                team_role: {
                    permissions: [],
                },
                channel_role: {
                    permissions: [],
                },
            },
        },
        general: {
            license: {IsLicensed: 'false'},
            serverVersion: '5.4.0',
            config: {PostEditTimeLimit: -1},
        },
    },
};

const viewCommand: AppBinding = {
    app_id: 'jira',
    label: 'view',
    location: 'view',
    description: 'View details of a Jira issue',
    form: {
        call: {
            url: '/view-issue',
        },
        fields: [
            {
                name: 'project',
                label: 'project',
                description: 'The Jira project description',
                type: AppFieldTypes.DYNAMIC_SELECT,
                hint: 'The Jira project hint',
                is_required: true,
            },
            {
                name: 'issue',
                position: 1,
                description: 'The Jira issue key',
                type: AppFieldTypes.TEXT,
                hint: 'MM-11343',
                is_required: true,
            },
        ],
    } as AppForm,
};

const createCommand: AppBinding = {
    app_id: 'jira',
    label: 'create',
    location: 'create',
    description: 'Create a new Jira issue',
    form: {
        call: {
            url: '/create-issue',
        },
        fields: [
            {
                name: 'project',
                label: 'project',
                description: 'The Jira project description',
                type: AppFieldTypes.DYNAMIC_SELECT,
                hint: 'The Jira project hint',
            },
            {
                name: 'summary',
                label: 'summary',
                description: 'The Jira issue summary',
                type: AppFieldTypes.TEXT,
                hint: 'The thing is working great!',
            },
            {
                name: 'verbose',
                label: 'verbose',
                description: 'display details',
                type: AppFieldTypes.BOOL,
                hint: 'yes or no!',
            },
            {
                name: 'epic',
                label: 'epic',
                description: 'The Jira epic',
                type: AppFieldTypes.STATIC_SELECT,
                hint: 'The thing is working great!',
                options: [
                    {
                        label: 'Dylan Epic',
                        value: 'epic1',
                    },
                    {
                        label: 'Michael Epic',
                        value: 'epic2',
                    },
                ],
            },
        ],
    } as AppForm,
};

const definitions: AppBinding[] = [
    {
        app_id: 'jira',
        location: '/command',
        label: 'jira',
        bindings: [{
            app_id: 'jira',
            label: 'issue',
            description: 'Interact with Jira issues',
            bindings: [
                viewCommand,
                createCommand,
            ],
        }],
    },
    {
        app_id: 'other',
        location: '/command',
        label: 'other',
        bindings: [{
            app_id: 'other',
            label: 'sub1',
            description: 'Some Description',
            form: {
                fields: [{
                    name: 'summary',
                    label: 'summary',
                    description: 'The Jira issue summary',
                    type: AppFieldTypes.TEXT,
                    hint: 'The thing is working great!',
                }],
            },
        }],
    },
];

describe('AppCommandParser', () => {
    const makeStore = async (bindings: AppBinding[]) => {
        const initialState = {
            ...reduxTestState,
            entities: {
                ...reduxTestState.entities,
                apps: {bindings},
            },
        } as any;
        const testStore = await mockStore(initialState);

        return testStore;
    };

    let parser: AppCommandParser;
    beforeEach(async () => {
        const store = await makeStore(definitions);
        parser = new AppCommandParser(store as any, '');
    });

    type Variant = {
        expectError?: string;
        verify?(parsed: ParsedCommand): void;
    }

    type TC = {
        title: string;
        command: string;
        submit: Variant;
        autocomplete?: Variant; // if undefined, use same checks as submnit
    }

    const checkResult = (parsed: ParsedCommand, v: Variant) => {
        if (v.expectError) {
            expect(parsed.state).toBe(ParseState.Error);
            expect(parsed.error).toBe(v.expectError);
        } else {
            // expect(parsed).toBe(1);
            expect(parsed.error).toBe('');
            expect(v.verify).toBeTruthy();
            if (v.verify) {
                v.verify(parsed);
            }
        }
    };

    describe('getSuggestionsBase', () => {
        test('string matches 1', () => {
            const res = parser.getSuggestionsBase('/');
            expect(res).toHaveLength(2);
        });

        test('string matches 2', () => {
            const res = parser.getSuggestionsBase('/ji');
            expect(res).toHaveLength(1);
        });

        test('string matches 3', () => {
            const res = parser.getSuggestionsBase('/jira');
            expect(res).toHaveLength(1);
        });

        test('string matches case insensitive', () => {
            const res = parser.getSuggestionsBase('/JiRa');
            expect(res).toHaveLength(1);
        });

        test('string is past base command', () => {
            const res = parser.getSuggestionsBase('/jira ');
            expect(res).toHaveLength(0);
        });

        test('other command matches', () => {
            const res = parser.getSuggestionsBase('/other');
            expect(res).toHaveLength(1);
        });

        test('string does not match', () => {
            const res = parser.getSuggestionsBase('/wrong');
            expect(res).toHaveLength(0);
        });
    });

    describe('matchBinding', () => {
        const table: TC[] = [
            {
                title: 'full command',
                command: '/jira issue create --project P  --summary = "SUM MA RY" --verbose --epic=epic2',
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndCommand);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.incomplete).toBe('--project');
                    expect(parsed.incompleteStart).toBe(19);
                }},
            },
            {
                title: 'full command case insensitive',
                command: '/JiRa IsSuE CrEaTe --PrOjEcT P  --SuMmArY = "SUM MA RY" --VeRbOsE --EpIc=epic2',
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndCommand);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.incomplete).toBe('--PrOjEcT');
                    expect(parsed.incompleteStart).toBe(19);
                }},
            },
            {
                title: 'incomplete top command',
                command: '/jir',
                autocomplete: {expectError: '"/jir": no match'},
                submit: {expectError: '"/jir": no match'},
            },
            {
                title: 'no space after the top command',
                command: '/jira',
                autocomplete: {expectError: '"/jira": no match'},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.Command);
                    expect(parsed.binding?.label).toBe('jira');
                }},
            },
            {
                title: 'space after the top command',
                command: '/jira ',
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.Command);
                    expect(parsed.binding?.label).toBe('jira');
                }},
            },
            {
                title: 'middle of subcommand',
                command: '/jira    iss',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.Command);
                    expect(parsed.binding?.label).toBe('jira');
                    expect(parsed.incomplete).toBe('iss');
                    expect(parsed.incompleteStart).toBe(9);
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndCommand);
                    expect(parsed.binding?.label).toBe('jira');
                    expect(parsed.incomplete).toBe('iss');
                    expect(parsed.incompleteStart).toBe(9);
                }},
            },
            {
                title: 'second subcommand, no space',
                command: '/jira issue',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.Command);
                    expect(parsed.binding?.label).toBe('jira');
                    expect(parsed.incomplete).toBe('issue');
                    expect(parsed.incompleteStart).toBe(6);
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.Command);
                    expect(parsed.binding?.label).toBe('issue');
                    expect(parsed.location).toBe('/jira/issue');
                }},
            },
            {
                title: 'token after the end of bindings, no space',
                command: '/jira issue create  something',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.Command);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.incomplete).toBe('something');
                    expect(parsed.incompleteStart).toBe(20);
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndCommand);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.incomplete).toBe('something');
                    expect(parsed.incompleteStart).toBe(20);
                }},
            },
            {
                title: 'token after the end of bindings, with space',
                command: '/jira issue create  something  ',
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndCommand);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.incomplete).toBe('something');
                    expect(parsed.incompleteStart).toBe(20);
                }},
            },
        ];

        table.forEach((tc) => {
            test(tc.title, async () => {
                let a = new ParsedCommand(tc.command, parser);
                a = await a.matchBinding(definitions, true);
                checkResult(a, tc.autocomplete || tc.submit);

                let s = new ParsedCommand(tc.command, parser);
                s = await s.matchBinding(definitions, false);
                checkResult(s, tc.submit);
            });
        });
    });

    describe('parseForm', () => {
        const table: TC[] = [
            {
                title: 'happy full create',
                command: '/jira issue create --project `P 1`  --summary "SUM MA RY" --verbose --epic=epic2',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.url).toBe('/create-issue');
                    expect(parsed.incomplete).toBe('epic2');
                    expect(parsed.incompleteStart).toBe(75);
                    expect(parsed.values?.project).toBe('P 1');
                    expect(parsed.values?.epic).toBeUndefined();
                    expect(parsed.values?.summary).toBe('SUM MA RY');
                    expect(parsed.values?.verbose).toBe('true');
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.url).toBe('/create-issue');
                    expect(parsed.values?.project).toBe('P 1');
                    expect(parsed.values?.epic).toBe('epic2');
                    expect(parsed.values?.summary).toBe('SUM MA RY');
                    expect(parsed.values?.verbose).toBe('true');
                }},
            },
            {
                title: 'happy full create case insensitive',
                command: '/JiRa IsSuE CrEaTe --PrOjEcT `P 1`  --SuMmArY "SUM MA RY" --VeRbOsE --EpIc=epic2',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.url).toBe('/create-issue');
                    expect(parsed.incomplete).toBe('epic2');
                    expect(parsed.incompleteStart).toBe(75);
                    expect(parsed.values?.project).toBe('P 1');
                    expect(parsed.values?.epic).toBeUndefined();
                    expect(parsed.values?.summary).toBe('SUM MA RY');
                    expect(parsed.values?.verbose).toBe('true');
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.url).toBe('/create-issue');
                    expect(parsed.values?.project).toBe('P 1');
                    expect(parsed.values?.epic).toBe('epic2');
                    expect(parsed.values?.summary).toBe('SUM MA RY');
                    expect(parsed.values?.verbose).toBe('true');
                }},
            },
            {
                title: 'partial epic',
                command: '/jira issue create --project KT --summary "great feature" --epic M',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.url).toBe('/create-issue');
                    expect(parsed.incomplete).toBe('M');
                    expect(parsed.incompleteStart).toBe(65);
                    expect(parsed.values?.project).toBe('KT');
                    expect(parsed.values?.epic).toBeUndefined();
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.url).toBe('/create-issue');
                    expect(parsed.values?.epic).toBe('M');
                }},
            },

            {
                title: 'happy full view',
                command: '/jira issue view --project=`P 1` MM-123',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.url).toBe('/view-issue');
                    expect(parsed.incomplete).toBe('MM-123');
                    expect(parsed.incompleteStart).toBe(33);
                    expect(parsed.values?.project).toBe('P 1');
                    expect(parsed.values?.issue).toBe(undefined);
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.url).toBe('/view-issue');
                    expect(parsed.values?.project).toBe('P 1');
                    expect(parsed.values?.issue).toBe('MM-123');
                }},
            },
            {
                title: 'happy view no parameters',
                command: '/jira issue view ',
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.StartParameter);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.url).toBe('/view-issue');
                    expect(parsed.incomplete).toBe('');
                    expect(parsed.incompleteStart).toBe(17);
                    expect(parsed.values).toEqual({});
                }},
            },
            {
                title: 'happy create flag no value',
                command: '/jira issue create --summary ',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.FlagValueSeparator);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.url).toBe('/create-issue');
                    expect(parsed.incomplete).toBe('');
                    expect(parsed.values).toEqual({});
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.url).toBe('/create-issue');
                    expect(parsed.incomplete).toBe('');
                    expect(parsed.values).toEqual({
                        summary: '',
                    });
                }},
            },
            {
                title: 'error: unmatched tick',
                command: '/jira issue view --project `P 1',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.TickValue);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.url).toBe('/view-issue');
                    expect(parsed.incomplete).toBe('P 1');
                    expect(parsed.incompleteStart).toBe(27);
                    expect(parsed.values?.project).toBe(undefined);
                    expect(parsed.values?.issue).toBe(undefined);
                }},
                submit: {expectError: 'matching tick quote expected before end of input'},
            },
            {
                title: 'error: unmatched quote',
                command: '/jira issue view --project "P \\1',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.QuotedValue);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.url).toBe('/view-issue');
                    expect(parsed.incomplete).toBe('P 1');
                    expect(parsed.incompleteStart).toBe(27);
                    expect(parsed.values?.project).toBe(undefined);
                    expect(parsed.values?.issue).toBe(undefined);
                }},
                submit: {expectError: 'matching double quote expected before end of input'},
            },
            {
                title: 'missing required fields not a problem for parseCommand',
                command: '/jira issue view --project "P 1"',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.url).toBe('/view-issue');
                    expect(parsed.incomplete).toBe('P 1');
                    expect(parsed.incompleteStart).toBe(27);
                    expect(parsed.values?.project).toBe(undefined);
                    expect(parsed.values?.issue).toBe(undefined);
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.url).toBe('/view-issue');
                    expect(parsed.values?.project).toBe('P 1');
                    expect(parsed.values?.issue).toBe(undefined);
                }},
            },
            {
                title: 'error: invalid flag',
                command: '/jira issue view --wrong test',
                submit: {expectError: 'command does not accept flag wrong'},
            },
            {
                title: 'error: unexpected positional',
                command: '/jira issue create wrong',
                submit: {expectError: 'command does not accept 1 positional arguments'},
            },
            {
                title: 'error: multiple equal signs',
                command: '/jira issue create --project == test',
                submit: {expectError: 'multiple = signs are not allowed'},
            },
        ];

        table.forEach((tc) => {
            test(tc.title, async () => {
                let a = new ParsedCommand(tc.command, parser);
                a = await a.matchBinding(definitions, true);
                a = a.parseForm(true);
                checkResult(a, tc.autocomplete || tc.submit);

                let s = new ParsedCommand(tc.command, parser);
                s = await s.matchBinding(definitions, false);
                s = s.parseForm(false);
                checkResult(s, tc.submit);
            });
        });
    });

    describe('getSuggestions', () => {
        test('just the app command', async () => {
            const suggestions = await parser.getSuggestions('/jira');
            expect(suggestions).toEqual([]);
        });

        test('subcommand 1', async () => {
            const suggestions = await parser.getSuggestions('/jira ');
            expect(suggestions).toEqual([
                {
                    suggestion: '/issue',
                    complete: '/jira issue',
                    hint: '',
                    description: 'Interact with Jira issues',
                },
            ]);
        });

        test('subcommand 1 case insensitive', async () => {
            const suggestions = await parser.getSuggestions('/JiRa ');
            expect(suggestions).toEqual([
                {
                    suggestion: '/issue',
                    complete: '/JiRa issue',
                    hint: '',
                    description: 'Interact with Jira issues',
                },
            ]);
        });

        test('subcommand 2', async () => {
            const suggestions = await parser.getSuggestions('/jira issue');
            expect(suggestions).toEqual([
                {
                    suggestion: '/issue',
                    complete: '/jira issue',
                    hint: '',
                    description: 'Interact with Jira issues',
                },
            ]);
        });

        test('subcommand 2 case insensitive', async () => {
            const suggestions = await parser.getSuggestions('/JiRa IsSuE');
            expect(suggestions).toEqual([
                {
                    suggestion: '/issue',
                    complete: '/JiRa issue',
                    hint: '',
                    description: 'Interact with Jira issues',
                },
            ]);
        });

        test('subcommand 2 with a space', async () => {
            const suggestions = await parser.getSuggestions('/jira issue ');
            expect(suggestions).toEqual([
                {
                    suggestion: '/view',
                    complete: '/jira issue view',
                    hint: '',
                    description: 'View details of a Jira issue',
                },
                {
                    suggestion: '/create',
                    complete: '/jira issue create',
                    hint: '',
                    description: 'Create a new Jira issue',
                },
            ]);
        });

        test('subcommand 2 with a space case insensitive', async () => {
            const suggestions = await parser.getSuggestions('/JiRa IsSuE ');
            expect(suggestions).toEqual([
                {
                    suggestion: '/view',
                    complete: '/JiRa IsSuE view',
                    hint: '',
                    description: 'View details of a Jira issue',
                },
                {
                    suggestion: '/create',
                    complete: '/JiRa IsSuE create',
                    hint: '',
                    description: 'Create a new Jira issue',
                },
            ]);
        });

        test('subcommand 3 partial', async () => {
            const suggestions = await parser.getSuggestions('/jira issue c');
            expect(suggestions).toEqual([
                {
                    suggestion: '/create',
                    complete: '/jira issue create',
                    hint: '',
                    description: 'Create a new Jira issue',
                },
            ]);
        });

        test('subcommand 3 partial case insensitive', async () => {
            const suggestions = await parser.getSuggestions('/JiRa IsSuE C');
            expect(suggestions).toEqual([
                {
                    suggestion: '/create',
                    complete: '/JiRa IsSuE create',
                    hint: '',
                    description: 'Create a new Jira issue',
                },
            ]);
        });

        test('view just after subcommand (positional)', async () => {
            const suggestions = await parser.getSuggestions('/jira issue view ');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue view',
                    description: 'The Jira issue key',
                    hint: 'MM-11343',
                    suggestion: '/',
                },
            ]);
        });

        test('view flags just after subcommand', async () => {
            let suggestions = await parser.getSuggestions('/jira issue view -');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue view --project',
                    description: 'The Jira project description',
                    hint: 'The Jira project hint',
                    suggestion: '/--project',
                },
            ]);

            suggestions = await parser.getSuggestions('/jira issue view --');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue view --project',
                    description: 'The Jira project description',
                    hint: 'The Jira project hint',
                    suggestion: '/--project',
                },
            ]);
        });

        test('create flags just after subcommand', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create ');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create _execute_current_command',
                    description: 'Select this option or use Ctrl+Enter to execute the current command.',
                    hint: '',
                    iconData: '_execute_current_command',
                    suggestion: '/Execute Current Command',
                },
                {
                    complete: '/jira issue create --project',
                    description: 'The Jira project description',
                    hint: 'The Jira project hint',
                    suggestion: '/--project',
                },
                {
                    complete: '/jira issue create --summary',
                    description: 'The Jira issue summary',
                    hint: 'The thing is working great!',
                    suggestion: '/--summary',
                },
                {
                    complete: '/jira issue create --verbose',
                    description: 'display details',
                    hint: 'yes or no!',
                    suggestion: '/--verbose',
                },
                {
                    complete: '/jira issue create --epic',
                    description: 'The Jira epic',
                    hint: 'The thing is working great!',
                    suggestion: '/--epic',
                },
            ]);
        });

        test('used flags do not appear', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT ');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --project KT _execute_current_command',
                    description: 'Select this option or use Ctrl+Enter to execute the current command.',
                    hint: '',
                    iconData: '_execute_current_command',
                    suggestion: '/Execute Current Command',
                },
                {
                    complete: '/jira issue create --project KT --summary',
                    description: 'The Jira issue summary',
                    hint: 'The thing is working great!',
                    suggestion: '/--summary',
                },
                {
                    complete: '/jira issue create --project KT --verbose',
                    description: 'display details',
                    hint: 'yes or no!',
                    suggestion: '/--verbose',
                },
                {
                    complete: '/jira issue create --project KT --epic',
                    description: 'The Jira epic',
                    hint: 'The thing is working great!',
                    suggestion: '/--epic',
                },
            ]);
        });

        test('create flags mid-flag', async () => {
            const mid = await parser.getSuggestions('/jira issue create --project KT --summ');
            expect(mid).toEqual([
                {
                    complete: '/jira issue create --project KT --summary',
                    description: 'The Jira issue summary',
                    hint: 'The thing is working great!',
                    suggestion: '/--summary',
                },
            ]);

            const full = await parser.getSuggestions('/jira issue create --project KT --summary');
            expect(full).toEqual([
                {
                    complete: '/jira issue create --project KT --summary',
                    description: 'The Jira issue summary',
                    hint: 'The thing is working great!',
                    suggestion: '/--summary',
                },
            ]);
        });

        test('empty text value suggestion', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary ');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --project KT --summary',
                    description: 'The Jira issue summary',
                    hint: 'The thing is working great!',
                    suggestion: '/',
                },
            ]);
        });

        test('partial text value suggestion', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary Sum');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --project KT --summary Sum',
                    description: 'The Jira issue summary',
                    hint: 'The thing is working great!',
                    suggestion: '/Sum',
                },
            ]);
        });

        test('quote text value suggestion close quotes', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "Sum');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --project KT --summary "Sum"',
                    description: 'The Jira issue summary',
                    hint: 'The thing is working great!',
                    suggestion: '/Sum',
                },
            ]);
        });

        test('tick text value suggestion close quotes', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary `Sum');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --project KT --summary `Sum`',
                    description: 'The Jira issue summary',
                    hint: 'The thing is working great!',
                    suggestion: '/Sum',
                },
            ]);
        });

        test('create flag summary value', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --summary ');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --summary',
                    description: 'The Jira issue summary',
                    hint: 'The thing is working great!',
                    suggestion: '/',
                },
            ]);
        });

        test('create flag project dynamic select value', async () => {
            const f = Client4.executeAppCall;
            Client4.executeAppCall = jest.fn().mockResolvedValue(Promise.resolve({data: {items: [{label: 'special-label', value: 'special-value'}]}}));

            const suggestions = await parser.getSuggestions('/jira issue create --project ');
            Client4.executeAppCall = f;

            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --project special-value',
                    suggestion: '/special-value',
                    description: 'special-label',
                    hint: '',
                    iconData: undefined,
                },
            ]);
        });

        test('create flag epic static select value', async () => {
            let suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "great feature" --epic ');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --project KT --summary "great feature" --epic Dylan Epic',
                    suggestion: '/Dylan Epic',
                    description: '',
                    hint: '',
                },
                {
                    complete: '/jira issue create --project KT --summary "great feature" --epic Michael Epic',
                    suggestion: '/Michael Epic',
                    description: '',
                    hint: '',
                },
            ]);

            suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "great feature" --epic M');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --project KT --summary "great feature" --epic Michael Epic',
                    suggestion: '/Michael Epic',
                    description: '',
                    hint: '',
                },
            ]);

            suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "great feature" --epic Nope');
            expect(suggestions).toEqual([]);
        });

        test('filled out form shows execute', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "great feature" --epic epicvalue --verbose true ');
            expect(suggestions).toEqual([
                {
                    complete: '/jira issue create --project KT --summary "great feature" --epic epicvalue --verbose true _execute_current_command',
                    suggestion: '/Execute Current Command',
                    description: 'Select this option or use Ctrl+Enter to execute the current command.',
                    iconData: '_execute_current_command',
                    hint: '',
                },
            ]);
        });
    });
});
