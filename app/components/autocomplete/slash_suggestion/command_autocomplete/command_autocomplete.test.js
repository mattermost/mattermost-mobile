// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CommandAutocomplete, {AUTOCOMPLETE_ARG} from './command_autocomplete';

describe('components/autocomplete/slash_suggestions/command_autocomplete', () => {
    const commandAutocomplete = new CommandAutocomplete(null);

    test('should parse input text argument', () => {
        const argument = {
            Name: '', //positional
            HelpText: 'some_help',
            Type: AUTOCOMPLETE_ARG.TEXT,
            Data: {Hint: 'hint', Pattern: 'pat'},
        };

        let found;
        let suggestion;
        ({found, suggestion} = commandAutocomplete.parseInputTextArgument(argument, '', ''));
        expect(found).toEqual(true);
        expect(suggestion).toEqual({Complete: '', Suggestion: '', Hint: 'hint', Description: 'some_help'});

        ({found, suggestion} = commandAutocomplete.parseInputTextArgument(argument, '', ' '));
        expect(found).toEqual(true);
        expect(suggestion).toEqual({Complete: ' ', Suggestion: '', Hint: 'hint', Description: 'some_help'});

        ({found, suggestion} = commandAutocomplete.parseInputTextArgument(argument, '', 'abc'));
        expect(found).toEqual(true);
        expect(suggestion).toEqual({Complete: 'abc', Suggestion: '', Hint: 'hint', Description: 'some_help'});

        ({found, suggestion} = commandAutocomplete.parseInputTextArgument(argument, '', '"abc dfd df '));
        expect(found).toEqual(true);
        expect(suggestion).toEqual({Complete: '"abc dfd df ', Suggestion: '', Hint: 'hint', Description: 'some_help'});

        let parsed;
        let toBeParsed;
        ({found, parsed, toBeParsed} = commandAutocomplete.parseInputTextArgument(argument, '', 'abc efg '));
        expect(found).toEqual(false);
        expect(parsed).toEqual('abc ');
        expect(toBeParsed).toEqual('efg ');

        ({found, parsed, toBeParsed} = commandAutocomplete.parseInputTextArgument(argument, '', 'abc '));
        expect(found).toEqual(false);
        expect(parsed).toEqual('abc ');
        expect(toBeParsed).toEqual('');

        ({found, parsed, toBeParsed} = commandAutocomplete.parseInputTextArgument(argument, '', '"abc def" abc'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('"abc def" ');
        expect(toBeParsed).toEqual('abc');

        ({found, parsed, toBeParsed} = commandAutocomplete.parseInputTextArgument(argument, '', '"abc def"'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('"abc def"');
        expect(toBeParsed).toEqual('');
    });

    test('should parse static list arguments', () => {
        const items = {
            Hint: '[hint]',
            Item: 'on',
            HelpText: 'help',
        };
        const argument = {
            Name: '', //positional
            HelpText: 'some_help',
            Type: AUTOCOMPLETE_ARG.STATIC_LIST,
            Data: {PossibleArguments: [items]},
        };
        let found;
        let suggestions;
        ({found, suggestions} = commandAutocomplete.parseStaticListArgument(argument, '', ''));
        expect(found).toEqual(true);
        expect(suggestions).toEqual([{Complete: 'on', Suggestion: 'on', Hint: '[hint]', Description: 'help'}]);

        ({found, suggestions} = commandAutocomplete.parseStaticListArgument(argument, '', 'o'));
        expect(found).toEqual(true);
        expect(suggestions).toEqual([{Complete: 'on', Suggestion: 'on', Hint: '[hint]', Description: 'help'}]);

        let parsed;
        let toBeParsed;
        ({found, parsed, toBeParsed} = commandAutocomplete.parseStaticListArgument(argument, '', 'on '));
        expect(found).toEqual(false);
        expect(parsed).toEqual('on ');
        expect(toBeParsed).toEqual('');

        ({found, parsed, toBeParsed} = commandAutocomplete.parseStaticListArgument(argument, '', 'on some'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('on ');
        expect(toBeParsed).toEqual('some');

        argument.Data.PossibleArguments.push({Hint: '[hint]', Item: 'off', HelpText: 'help'});

        ({found, suggestions} = commandAutocomplete.parseStaticListArgument(argument, '', 'o'));
        expect(found).toEqual(true);
        expect(suggestions).toEqual([{Complete: 'on', Suggestion: 'on', Hint: '[hint]', Description: 'help'}, {Complete: 'off', Suggestion: 'off', Hint: '[hint]', Description: 'help'}]);

        ({found, suggestions} = commandAutocomplete.parseStaticListArgument(argument, '', 'off'));
        expect(found).toEqual(true);
        expect(suggestions).toEqual([{Complete: 'off', Suggestion: 'off', Hint: '[hint]', Description: 'help'}]);

        ({found, suggestions} = commandAutocomplete.parseStaticListArgument(argument, '', 'o some'));
        expect(found).toEqual(true);
        expect(suggestions).toEqual([]);

        ({found, parsed, toBeParsed} = commandAutocomplete.parseStaticListArgument(argument, '', 'off some'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('off ');
        expect(toBeParsed).toEqual('some');

        argument.Data.PossibleArguments.push({Hint: '[hint]', Item: 'onon', HelpText: 'help'});

        ({found, suggestions} = commandAutocomplete.parseStaticListArgument(argument, '', 'on'));
        expect(found).toEqual(true);
        expect(suggestions).toEqual([{Complete: 'on', Suggestion: 'on', Hint: '[hint]', Description: 'help'}, {Complete: 'onon', Suggestion: 'onon', Hint: '[hint]', Description: 'help'}]);

        ({found, suggestions} = commandAutocomplete.parseStaticListArgument(argument, 'bla ', 'ono'));
        expect(found).toEqual(true);
        expect(suggestions).toEqual([{Complete: 'bla onon', Suggestion: 'onon', Hint: '[hint]', Description: 'help'}]);

        ({found, parsed, toBeParsed} = commandAutocomplete.parseStaticListArgument(argument, '', 'on some'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('on ');
        expect(toBeParsed).toEqual('some');

        ({found, parsed, toBeParsed} = commandAutocomplete.parseStaticListArgument(argument, '', 'onon some'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('onon ');
        expect(toBeParsed).toEqual('some');
    });

    test('should parse static list arguments', () => {
        const argument = {
            Name: 'name', //named
            HelpText: 'some_help',
            Type: AUTOCOMPLETE_ARG.TEXT,
            Data: {Hint: 'hint', Pattern: 'pat'},
        };

        let found;
        let suggestion;
        ({found, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', ''));
        expect(found).toEqual(true);
        expect(suggestion).toEqual({Complete: '--name ', Suggestion: '--name', Hint: '', Description: 'some_help'});

        ({found, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', ' '));
        expect(found).toEqual(true);
        expect(suggestion).toEqual({Complete: ' --name ', Suggestion: '--name', Hint: '', Description: 'some_help'});

        let parsed;
        let toBeParsed;
        ({found, parsed, toBeParsed} = commandAutocomplete.parseNamedArgument(argument, '', 'abc'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('abc');
        expect(toBeParsed).toEqual('');

        ({found, parsed, toBeParsed, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', '-'));
        expect(found).toEqual(true);
        expect(parsed).toEqual('-');
        expect(toBeParsed).toEqual('');
        expect(suggestion).toEqual({Complete: '--name ', Suggestion: '--name', Hint: '', Description: 'some_help'});

        ({found, parsed, toBeParsed, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', ' -'));
        expect(found).toEqual(true);
        expect(parsed).toEqual(' -');
        expect(toBeParsed).toEqual('');
        expect(suggestion).toEqual({Complete: ' --name ', Suggestion: '--name', Hint: '', Description: 'some_help'});

        ({found, parsed, toBeParsed, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', '--name'));
        expect(found).toEqual(true);
        expect(parsed).toEqual('--name');
        expect(toBeParsed).toEqual('');
        expect(suggestion).toEqual({Complete: '--name ', Suggestion: '--name', Hint: '', Description: 'some_help'});

        ({found, parsed, toBeParsed, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', '--name bla'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('--name ');
        expect(toBeParsed).toEqual('bla');

        ({found, parsed, toBeParsed, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', '--name bla gla'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('--name ');
        expect(toBeParsed).toEqual('bla gla');

        ({found, parsed, toBeParsed, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', '--name "bla gla"'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('--name ');
        expect(toBeParsed).toEqual('"bla gla"');

        ({found, parsed, toBeParsed, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', '--name "bla gla" '));
        expect(found).toEqual(false);
        expect(parsed).toEqual('--name ');
        expect(toBeParsed).toEqual('"bla gla" ');

        ({found, parsed, toBeParsed, suggestion} = commandAutocomplete.parseNamedArgument(argument, '', 'bla'));
        expect(found).toEqual(false);
        expect(parsed).toEqual('bla');
        expect(toBeParsed).toEqual('');
    });

    test('should autocomplete command with optional args', () => {
        const command = createCommandWithOptionalArgs();
        let suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'comm');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: command.Trigger,
            Suggestion: command.Trigger,
            Hint: '',
            Description: command.HelpText,
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command ');
        expect(suggestions).toHaveLength(4);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand1',
            Suggestion: 'subcommand1',
            Hint: '',
            Description: '',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand2',
            Suggestion: 'subcommand2',
            Hint: '',
            Description: '',
        });
        expect(suggestions[2]).toEqual({
            Complete: 'command subcommand3',
            Suggestion: 'subcommand3',
            Hint: '',
            Description: '',
        });
        expect(suggestions[3]).toEqual({
            Complete: 'command subcommand4',
            Suggestion: 'subcommand4',
            Hint: '',
            Description: 'help1',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand1 ');
        expect(suggestions).toHaveLength(2);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand1 item1',
            Suggestion: 'item1',
            Hint: '',
            Description: '',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand1 item2',
            Suggestion: 'item2',
            Hint: '',
            Description: '',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand1 item1 ');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand1 item1 --name2 ',
            Suggestion: '--name2',
            Hint: '',
            Description: 'arg2',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand1 item1 --name2 bla');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand1 item1 --name2 bla',
            Suggestion: '',
            Hint: '',
            Description: 'arg2',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand2 ');
        expect(suggestions).toHaveLength(2);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand2 --name1 ',
            Suggestion: '--name1',
            Hint: '',
            Description: 'arg1',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand2 ',
            Suggestion: '',
            Hint: '',
            Description: 'arg2',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand2 -');
        expect(suggestions).toHaveLength(2);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand2 --name1 ',
            Suggestion: '--name1',
            Hint: '',
            Description: 'arg1',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand2 -',
            Suggestion: '',
            Hint: '',
            Description: 'arg2',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand2 --name1 ');
        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand2 --name1 item1',
            Suggestion: 'item1',
            Hint: '',
            Description: '',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand2 --name1 item2',
            Suggestion: 'item2',
            Hint: '',
            Description: '',
        });
        expect(suggestions[2]).toEqual({
            Complete: 'command subcommand2 --name1 ',
            Suggestion: '',
            Hint: '',
            Description: 'arg3',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand2 --name1 item');
        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand2 --name1 item1',
            Suggestion: 'item1',
            Hint: '',
            Description: '',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand2 --name1 item2',
            Suggestion: 'item2',
            Hint: '',
            Description: '',
        });
        expect(suggestions[2]).toEqual({
            Complete: 'command subcommand2 --name1 item',
            Suggestion: '',
            Hint: '',
            Description: 'arg3',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand2 --name1 item1 ');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand2 --name1 item1 ',
            Suggestion: '',
            Hint: '',
            Description: 'arg2',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand2 --name1 item1 bla ');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand2 --name1 item1 bla ',
            Suggestion: '',
            Hint: '',
            Description: 'arg3',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand2 --name1 item1 bla bla ');
        expect(suggestions).toHaveLength(0);

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand3 ');
        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand3 --name1 ',
            Suggestion: '--name1',
            Hint: '',
            Description: 'arg1',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand3 --name2 ',
            Suggestion: '--name2',
            Hint: '',
            Description: 'arg2',
        });
        expect(suggestions[2]).toEqual({
            Complete: 'command subcommand3 --name3 ',
            Suggestion: '--name3',
            Hint: '',
            Description: 'arg3',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand3 --name');
        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand3 --name1 ',
            Suggestion: '--name1',
            Hint: '',
            Description: 'arg1',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand3 --name2 ',
            Suggestion: '--name2',
            Hint: '',
            Description: 'arg2',
        });
        expect(suggestions[2]).toEqual({
            Complete: 'command subcommand3 --name3 ',
            Suggestion: '--name3',
            Hint: '',
            Description: 'arg3',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand3 --name1 ');
        expect(suggestions).toHaveLength(2);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand3 --name1 item1',
            Suggestion: 'item1',
            Hint: '',
            Description: '',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand3 --name1 item2',
            Suggestion: 'item2',
            Hint: '',
            Description: '',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand4 ');
        expect(suggestions).toHaveLength(2);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand4 item1',
            Suggestion: 'item1',
            Hint: '(optional)',
            Description: 'help3',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'command subcommand4 ',
            Suggestion: '',
            Hint: 'message',
            Description: 'help4',
        });

        suggestions = commandAutocomplete.getSuggestions([command], {}, '', 'command subcommand4 item1 ');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'command subcommand4 item1 ',
            Suggestion: '',
            Hint: 'message',
            Description: 'help4',
        });
    });

    test('should autocomplete jira command', () => {
        const jira = createJiraAutocompleteData();
        let suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'ji');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: jira.Trigger,
            Suggestion: jira.Trigger,
            Hint: jira.Hint,
            Description: jira.HelpText,
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira crea');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'jira create',
            Suggestion: 'create',
            Hint: '[issue text]',
            Description: 'Create a new Issue',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira c');
        expect(suggestions).toHaveLength(2);
        expect(suggestions[0]).toEqual({
            Complete: 'jira connect',
            Suggestion: 'connect',
            Hint: '[url]',
            Description: 'Connect',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'jira create',
            Suggestion: 'create',
            Hint: '[issue text]',
            Description: 'Create a new Issue',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira create ');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'jira create ',
            Suggestion: '',
            Hint: '[text]',
            Description: 'This text',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira create some');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'jira create some',
            Suggestion: '',
            Hint: '[text]',
            Description: 'This text',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira create some text');
        expect(suggestions).toHaveLength(0);

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira create "some text');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'jira create "some text',
            Suggestion: '',
            Hint: '[text]',
            Description: 'This text',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'invalid command');
        expect(suggestions).toHaveLength(0);

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira settings notifications O');
        expect(suggestions).toHaveLength(2);
        expect(suggestions[0]).toEqual({
            Complete: 'jira settings notifications On',
            Suggestion: 'On',
            Hint: 'Turn notifications on',
            Description: '',
        });
        expect(suggestions[1]).toEqual({
            Complete: 'jira settings notifications Off',
            Suggestion: 'Off',
            Hint: 'Turn notifications off',
            Description: '',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira ');
        expect(suggestions).toHaveLength(9);

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira create "some issue text');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'jira create "some issue text',
            Suggestion: '',
            Hint: '[text]',
            Description: 'This text',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira timezone ');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'jira timezone --zone ',
            Suggestion: '--zone',
            Hint: '',
            Description: 'Set timezone',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira timezone --');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'jira timezone --zone ',
            Suggestion: '--zone',
            Hint: '',
            Description: 'Set timezone',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira timezone --zone ');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'jira timezone --zone ',
            Suggestion: '',
            Hint: '[UTC+07:00]',
            Description: 'Set timezone',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira timezone --zone bla');
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toEqual({
            Complete: 'jira timezone --zone bla',
            Suggestion: '',
            Hint: '[UTC+07:00]',
            Description: 'Set timezone',
        });

        suggestions = commandAutocomplete.getSuggestions([jira], {}, '', 'jira timezone bla');
        expect(suggestions).toHaveLength(0);
    });

    test('should autocomplete for multiple commands', () => {
        const commandA = {
            Trigger: 'commandA',
            Hint: '',
            HelpText: '',
            Arguments: [],
            SubCommands: [],
        };
        const commandB = {
            Trigger: 'commandB',
            Hint: '',
            HelpText: '',
            Arguments: [],
            SubCommands: [],
        };

        const commandC = {
            Trigger: 'commandC',
            Hint: '',
            HelpText: '',
            Arguments: [],
            SubCommands: [],
        };
        const suggestions = commandAutocomplete.getSuggestions([commandA, commandB, commandC], {}, '', 'comm');
        expect(suggestions).toHaveLength(3);
        expect(suggestions[0].Complete).toEqual('commandA');
        expect(suggestions[1].Complete).toEqual('commandB');
        expect(suggestions[2].Complete).toEqual('commandC');
    });
});

function createCommandWithOptionalArgs() {
    return {
        Trigger: 'command',
        Hint: '',
        HelpText: '',
        Arguments: [],
        SubCommands: [{
            Trigger: 'subcommand1',
            Hint: '',
            HelpText: '',
            Arguments: [{
                Name: '',
                HelpText: 'arg1',
                Type: AUTOCOMPLETE_ARG.STATIC_LIST,
                Required: true,
                Data: {PossibleArguments: [{Item: 'item1', Hint: '', HelpText: ''}, {Item: 'item2', Hint: '', HelpText: ''}]},
            }, {
                Name: 'name2',
                HelpText: 'arg2',
                Type: AUTOCOMPLETE_ARG.TEXT,
                Required: false,
                Data: {Hint: '', Pattern: ''},
            }],
            SubCommands: [],
        }, {
            Trigger: 'subcommand2',
            Hint: '',
            HelpText: '',
            Arguments: [{
                Name: 'name1',
                HelpText: 'arg1',
                Type: AUTOCOMPLETE_ARG.STATIC_LIST,
                Required: false,
                Data: {PossibleArguments: [{Item: 'item1', Hint: '', HelpText: ''}, {Item: 'item2', Hint: '', HelpText: ''}]},
            }, {
                Name: '',
                HelpText: 'arg2',
                Type: AUTOCOMPLETE_ARG.TEXT,
                Required: true,
                Data: {Hint: '', Pattern: ''},
            }, {
                Name: '',
                HelpText: 'arg3',
                Type: AUTOCOMPLETE_ARG.TEXT,
                Required: true,
                Data: {Hint: '', Pattern: ''},
            }],
            SubCommands: [],
        }, {
            Trigger: 'subcommand3',
            Hint: '',
            HelpText: '',
            Arguments: [{
                Name: 'name1',
                HelpText: 'arg1',
                Type: AUTOCOMPLETE_ARG.STATIC_LIST,
                Required: false,
                Data: {PossibleArguments: [{Item: 'item1', Hint: '', HelpText: ''}, {Item: 'item2', Hint: '', HelpText: ''}]},
            }, {
                Name: 'name2',
                HelpText: 'arg2',
                Type: AUTOCOMPLETE_ARG.TEXT,
                Required: false,
                Data: {Hint: '', Pattern: ''},
            }, {
                Name: 'name3',
                HelpText: 'arg3',
                Type: AUTOCOMPLETE_ARG.TEXT,
                Required: false,
                Data: {Hint: '', Pattern: ''},
            }],
            SubCommands: [],
        }, {
            Trigger: 'subcommand4',
            Hint: '',
            HelpText: 'help1',
            Arguments: [{
                Name: '',
                HelpText: 'help2',
                Type: AUTOCOMPLETE_ARG.STATIC_LIST,
                Required: false,
                Data: {PossibleArguments: [{Item: 'item1', Hint: '(optional)', HelpText: 'help3'}]},
            }, {
                Name: '',
                HelpText: 'help4',
                Type: AUTOCOMPLETE_ARG.TEXT,
                Required: true,
                Data: {Hint: 'message', Pattern: ''},
            }],
            SubCommands: [],
        }],
    };
}

function createJiraAutocompleteData() {
    return {
        Trigger: 'jira',
        Hint: '[command]',
        HelpText: 'Available commands:',
        Arguments: [],
        SubCommands: [{
            Trigger: 'connect',
            Hint: '[url]',
            HelpText: 'Connect',
            Arguments: [],
            SubCommands: [],
        }, {
            Trigger: 'disconnect',
            Hint: '',
            HelpText: 'Disconnect',
            Arguments: [],
            SubCommands: [],
        }, {
            Trigger: 'assign',
            Hint: '[issue]',
            HelpText: 'Change the assignee',
            Arguments: [{
                Name: '',
                HelpText: 'List of issues',
                Type: AUTOCOMPLETE_ARG.DYNAMIC_LIST,
                Required: true,
                Data: {FetchURL: '/url/issue-key'},
            }, {
                Name: '',
                HelpText: 'List of assignees',
                Type: AUTOCOMPLETE_ARG.DYNAMIC_LIST,
                Required: true,
                Data: {FetchURL: '/url/assignee'},
            }],
            SubCommands: [],
        }, {
            Trigger: 'create',
            Hint: '[issue text]',
            HelpText: 'Create a new Issue',
            Arguments: [{
                Name: '',
                HelpText: 'This text',
                Type: AUTOCOMPLETE_ARG.TEXT,
                Required: true,
                Data: {Hint: '[text]', Pattern: ''},
            }],
            SubCommands: [],
        }, {
            Trigger: 'transition',
            Hint: '[issue]',
            HelpText: 'Change the state',
            Arguments: [{
                Name: '',
                HelpText: 'List of issues',
                Type: AUTOCOMPLETE_ARG.DYNAMIC_LIST,
                Required: true,
                Data: {FetchURL: '/url/issue-key'},
            }, {
                Name: '',
                HelpText: 'List of states',
                Type: AUTOCOMPLETE_ARG.DYNAMIC_LIST,
                Required: true,
                Data: {FetchURL: '/url/states'},
            }],
            SubCommands: [],
        }, {
            Trigger: 'subscribe',
            Hint: '',
            HelpText: 'Configure the Jira',
            Arguments: [],
            SubCommands: [],
        }, {
            Trigger: 'view',
            Hint: '[issue]',
            HelpText: 'View the details',
            Arguments: [{
                Name: '',
                HelpText: 'List of issues',
                Type: AUTOCOMPLETE_ARG.DYNAMIC_LIST,
                Required: true,
                Data: {FetchURL: '/url/issue-key'},
            }],
            SubCommands: [],
        }, {
            Trigger: 'settings',
            Hint: '',
            HelpText: 'Update your user settings',
            Arguments: [],
            SubCommands: [{
                Trigger: 'notifications',
                Hint: '[on/off]',
                HelpText: 'Turn notifications on or off',
                Arguments: [{
                    Name: '',
                    HelpText: 'arg1',
                    Type: AUTOCOMPLETE_ARG.STATIC_LIST,
                    Required: false,
                    Data: {PossibleArguments: [{Item: 'On', Hint: 'Turn notifications on', HelpText: ''}, {Item: 'Off', Hint: 'Turn notifications off', HelpText: ''}]},
                }],
                SubCommands: [],
            }],
        }, {
            Trigger: 'timezone',
            Hint: '',
            HelpText: 'Update your timezone',
            Arguments: [{
                Name: 'zone',
                HelpText: 'Set timezone',
                Type: AUTOCOMPLETE_ARG.TEXT,
                Required: true,
                Data: {Hint: '[UTC+07:00]', Pattern: ''},
            }],
            SubCommands: [],
        }],
    };
}