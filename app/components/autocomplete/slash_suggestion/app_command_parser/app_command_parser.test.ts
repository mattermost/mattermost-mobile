// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {
    thunk,
    configureStore,
    Client4,
    AppBinding,
    checkForExecuteSuggestion,
} from './app_command_parser_test_dependencies';

import {
    AutocompleteSuggestion,
} from './app_command_parser_dependencies';

import {
    AppCommandParser,
    ParseState,
    ParsedCommand,
    groupBindingsByApp,
} from './app_command_parser';

import {
    reduxTestState,
    testBindings,
} from './test_data';

const mockStore = configureStore([thunk]);

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
        const store = await makeStore(testBindings);
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
                let bindings = testBindings[0].bindings as AppBinding[];
                bindings = groupBindingsByApp(bindings);

                let a = new ParsedCommand(tc.command, parser);
                a = await a.matchBinding(bindings, true);
                checkResult(a, tc.autocomplete || tc.submit);

                let s = new ParsedCommand(tc.command, parser);
                s = await s.matchBinding(bindings, false);
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
                    expect(parsed.form?.call?.path).toBe('/create-issue');
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
                    expect(parsed.form?.call?.path).toBe('/create-issue');
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
                    expect(parsed.form?.call?.path).toBe('/create-issue');
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
                    expect(parsed.form?.call?.path).toBe('/create-issue');
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
                    expect(parsed.form?.call?.path).toBe('/create-issue');
                    expect(parsed.incomplete).toBe('M');
                    expect(parsed.incompleteStart).toBe(65);
                    expect(parsed.values?.project).toBe('KT');
                    expect(parsed.values?.epic).toBeUndefined();
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.path).toBe('/create-issue');
                    expect(parsed.values?.epic).toBe('M');
                }},
            },

            {
                title: 'happy full view',
                command: '/jira issue view --project=`P 1` MM-123',
                autocomplete: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.path).toBe('/view-issue');
                    expect(parsed.incomplete).toBe('MM-123');
                    expect(parsed.incompleteStart).toBe(33);
                    expect(parsed.values?.project).toBe('P 1');
                    expect(parsed.values?.issue).toBe(undefined);
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.path).toBe('/view-issue');
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
                    expect(parsed.form?.call?.path).toBe('/view-issue');
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
                    expect(parsed.form?.call?.path).toBe('/create-issue');
                    expect(parsed.incomplete).toBe('');
                    expect(parsed.values).toEqual({});
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('create');
                    expect(parsed.form?.call?.path).toBe('/create-issue');
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
                    expect(parsed.form?.call?.path).toBe('/view-issue');
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
                    expect(parsed.form?.call?.path).toBe('/view-issue');
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
                    expect(parsed.form?.call?.path).toBe('/view-issue');
                    expect(parsed.incomplete).toBe('P 1');
                    expect(parsed.incompleteStart).toBe(27);
                    expect(parsed.values?.project).toBe(undefined);
                    expect(parsed.values?.issue).toBe(undefined);
                }},
                submit: {verify: (parsed: ParsedCommand): void => {
                    expect(parsed.state).toBe(ParseState.EndValue);
                    expect(parsed.binding?.label).toBe('view');
                    expect(parsed.form?.call?.path).toBe('/view-issue');
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
                let bindings = testBindings[0].bindings as AppBinding[];
                bindings = groupBindingsByApp(bindings);

                let a = new ParsedCommand(tc.command, parser);
                a = await a.matchBinding(bindings, true);
                a = a.parseForm(true);
                checkResult(a, tc.autocomplete || tc.submit);

                let s = new ParsedCommand(tc.command, parser);
                s = await s.matchBinding(bindings, false);
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
                    Suggestion: 'issue',
                    Complete: 'jira issue',
                    Hint: '',
                    IconData: '',
                    Description: 'Interact with Jira issues',
                },
            ]);
        });

        test('subcommand 1 case insensitive', async () => {
            const suggestions = await parser.getSuggestions('/JiRa ');
            expect(suggestions).toEqual([
                {
                    Suggestion: 'issue',
                    Complete: 'JiRa issue',
                    Hint: '',
                    IconData: '',
                    Description: 'Interact with Jira issues',
                },
            ]);
        });

        test('subcommand 2', async () => {
            const suggestions = await parser.getSuggestions('/jira issue');
            expect(suggestions).toEqual([
                {
                    Suggestion: 'issue',
                    Complete: 'jira issue',
                    Hint: '',
                    IconData: '',
                    Description: 'Interact with Jira issues',
                },
            ]);
        });

        test('subcommand 2 case insensitive', async () => {
            const suggestions = await parser.getSuggestions('/JiRa IsSuE');
            expect(suggestions).toEqual([
                {
                    Suggestion: 'issue',
                    Complete: 'JiRa issue',
                    Hint: '',
                    IconData: '',
                    Description: 'Interact with Jira issues',
                },
            ]);
        });

        test('subcommand 2 with a space', async () => {
            const suggestions = await parser.getSuggestions('/jira issue ');
            expect(suggestions).toEqual([
                {
                    Suggestion: 'view',
                    Complete: 'jira issue view',
                    Hint: '',
                    IconData: '',
                    Description: 'View details of a Jira issue',
                },
                {
                    Suggestion: 'create',
                    Complete: 'jira issue create',
                    Hint: '',
                    IconData: '',
                    Description: 'Create a new Jira issue',
                },
            ]);
        });

        test('subcommand 2 with a space case insensitive', async () => {
            const suggestions = await parser.getSuggestions('/JiRa IsSuE ');
            expect(suggestions).toEqual([
                {
                    Suggestion: 'view',
                    Complete: 'JiRa IsSuE view',
                    Hint: '',
                    IconData: '',
                    Description: 'View details of a Jira issue',
                },
                {
                    Suggestion: 'create',
                    Complete: 'JiRa IsSuE create',
                    Hint: '',
                    IconData: '',
                    Description: 'Create a new Jira issue',
                },
            ]);
        });

        test('subcommand 3 partial', async () => {
            const suggestions = await parser.getSuggestions('/jira issue c');
            expect(suggestions).toEqual([
                {
                    Suggestion: 'create',
                    Complete: 'jira issue create',
                    Hint: '',
                    IconData: '',
                    Description: 'Create a new Jira issue',
                },
            ]);
        });

        test('subcommand 3 partial case insensitive', async () => {
            const suggestions = await parser.getSuggestions('/JiRa IsSuE C');
            expect(suggestions).toEqual([
                {
                    Suggestion: 'create',
                    Complete: 'JiRa IsSuE create',
                    Hint: '',
                    IconData: '',
                    Description: 'Create a new Jira issue',
                },
            ]);
        });

        test('view just after subcommand (positional)', async () => {
            const suggestions = await parser.getSuggestions('/jira issue view ');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue view',
                    Description: 'The Jira issue key',
                    Hint: 'MM-11343',
                    IconData: '',
                    Suggestion: '',
                },
            ]);
        });

        test('view flags just after subcommand', async () => {
            let suggestions = await parser.getSuggestions('/jira issue view -');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue view --project',
                    Description: 'The Jira project description',
                    Hint: 'The Jira project hint',
                    IconData: '',
                    Suggestion: '--project',
                },
            ]);

            suggestions = await parser.getSuggestions('/jira issue view --');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue view --project',
                    Description: 'The Jira project description',
                    Hint: 'The Jira project hint',
                    IconData: '',
                    Suggestion: '--project',
                },
            ]);
        });

        test('create flags just after subcommand', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create ');

            let executeCommand: AutocompleteSuggestion[] = [];
            if (checkForExecuteSuggestion) {
                executeCommand = [
                    {
                        Complete: 'jira issue create _execute_current_command',
                        Description: 'Select this option or use Ctrl+Enter to execute the current command.',
                        Hint: '',
                        IconData: '_execute_current_command',
                        Suggestion: 'Execute Current Command',
                    },
                ];
            }

            expect(suggestions).toEqual([
                ...executeCommand,
                {
                    Complete: 'jira issue create --project',
                    Description: 'The Jira project description',
                    Hint: 'The Jira project hint',
                    IconData: '',
                    Suggestion: '--project',
                },
                {
                    Complete: 'jira issue create --summary',
                    Description: 'The Jira issue summary',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: '--summary',
                },
                {
                    Complete: 'jira issue create --verbose',
                    Description: 'display details',
                    Hint: 'yes or no!',
                    IconData: '',
                    Suggestion: '--verbose',
                },
                {
                    Complete: 'jira issue create --epic',
                    Description: 'The Jira epic',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: '--epic',
                },
            ]);
        });

        test('used flags do not appear', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT ');

            let executeCommand: AutocompleteSuggestion[] = [];
            if (checkForExecuteSuggestion) {
                executeCommand = [
                    {
                        Complete: 'jira issue create --project KT _execute_current_command',
                        Description: 'Select this option or use Ctrl+Enter to execute the current command.',
                        Hint: '',
                        IconData: '_execute_current_command',
                        Suggestion: 'Execute Current Command',
                    },
                ];
            }

            expect(suggestions).toEqual([
                ...executeCommand,
                {
                    Complete: 'jira issue create --project KT --summary',
                    Description: 'The Jira issue summary',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: '--summary',
                },
                {
                    Complete: 'jira issue create --project KT --verbose',
                    Description: 'display details',
                    Hint: 'yes or no!',
                    IconData: '',
                    Suggestion: '--verbose',
                },
                {
                    Complete: 'jira issue create --project KT --epic',
                    Description: 'The Jira epic',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: '--epic',
                },
            ]);
        });

        test('create flags mid-flag', async () => {
            const mid = await parser.getSuggestions('/jira issue create --project KT --summ');
            expect(mid).toEqual([
                {
                    Complete: 'jira issue create --project KT --summary',
                    Description: 'The Jira issue summary',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: '--summary',
                },
            ]);

            const full = await parser.getSuggestions('/jira issue create --project KT --summary');
            expect(full).toEqual([
                {
                    Complete: 'jira issue create --project KT --summary',
                    Description: 'The Jira issue summary',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: '--summary',
                },
            ]);
        });

        test('empty text value suggestion', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary ');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue create --project KT --summary',
                    Description: 'The Jira issue summary',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: '',
                },
            ]);
        });

        test('partial text value suggestion', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary Sum');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue create --project KT --summary Sum',
                    Description: 'The Jira issue summary',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: 'Sum',
                },
            ]);
        });

        test('quote text value suggestion close quotes', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "Sum');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue create --project KT --summary "Sum"',
                    Description: 'The Jira issue summary',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: 'Sum',
                },
            ]);
        });

        test('tick text value suggestion close quotes', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary `Sum');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue create --project KT --summary `Sum`',
                    Description: 'The Jira issue summary',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: 'Sum',
                },
            ]);
        });

        test('create flag summary value', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --summary ');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue create --summary',
                    Description: 'The Jira issue summary',
                    Hint: 'The thing is working great!',
                    IconData: '',
                    Suggestion: '',
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
                    Complete: 'jira issue create --project special-value',
                    Suggestion: 'special-value',
                    Description: 'special-label',
                    Hint: '',
                    IconData: '',
                },
            ]);
        });

        test('create flag epic static select value', async () => {
            let suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "great feature" --epic ');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue create --project KT --summary "great feature" --epic Dylan Epic',
                    Suggestion: 'Dylan Epic',
                    Description: 'The Jira epic',
                    Hint: 'The thing is working great!',
                    IconData: '',
                },
                {
                    Complete: 'jira issue create --project KT --summary "great feature" --epic Michael Epic',
                    Suggestion: 'Michael Epic',
                    Description: 'The Jira epic',
                    Hint: 'The thing is working great!',
                    IconData: '',
                },
            ]);

            suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "great feature" --epic M');
            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue create --project KT --summary "great feature" --epic Michael Epic',
                    Suggestion: 'Michael Epic',
                    Description: 'The Jira epic',
                    Hint: 'The thing is working great!',
                    IconData: '',
                },
            ]);

            suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "great feature" --epic Nope');
            expect(suggestions).toEqual([]);
        });

        test('filled out form shows execute', async () => {
            const suggestions = await parser.getSuggestions('/jira issue create --project KT --summary "great feature" --epic epicvalue --verbose true ');

            if (!checkForExecuteSuggestion) {
                expect(suggestions).toEqual([]);
                return;
            }

            expect(suggestions).toEqual([
                {
                    Complete: 'jira issue create --project KT --summary "great feature" --epic epicvalue --verbose true _execute_current_command',
                    Suggestion: 'Execute Current Command',
                    Description: 'Select this option or use Ctrl+Enter to execute the current command.',
                    IconData: '_execute_current_command',
                    Hint: '',
                },
            ]);
        });
    });
});
