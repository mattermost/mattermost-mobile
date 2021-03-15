// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {intlShape} from 'react-intl';

import {
    AppCallRequest,
    AppBinding,
    AppField,
    AppSelectOption,
    AppCallResponse,
    AppCallValues,
    AppContext,
    AppForm,
    AutocompleteSuggestion,
    AutocompleteStaticSelect,
    Channel,
    DispatchFunc,
    GlobalState,

    AppBindingLocations,
    AppCallResponseTypes,
    AppCallTypes,
    AppFieldTypes,
    getAppsBindings,
    getChannel,
    getCurrentTeamId,
    doAppCall,
    getStore,
    EXECUTE_CURRENT_COMMAND_ITEM_ID,
    getExecuteSuggestion,
    keyMirror,
    createCallRequest,
    displayError,
    selectChannelByName,
    selectUserByUsername,
    getUserByUsername,
    getChannelByNameAndTeamName,
    getCurrentTeam,
} from './app_command_parser_dependencies';

export type Store = {
    dispatch: DispatchFunc;
    getState: () => GlobalState;
}

export const ParseState = keyMirror({
    Start: null,
    Command: null,
    EndCommand: null,
    CommandSeparator: null,
    StartParameter: null,
    ParameterSeparator: null,
    Flag1: null,
    Flag: null,
    FlagValueSeparator: null,
    StartValue: null,
    NonspaceValue: null,
    QuotedValue: null,
    TickValue: null,
    EndValue: null,
    EndQuotedValue: null,
    EndTickedValue: null,
    Error: null,
});

interface FormsCache {
    getForm: (location: string, binding: AppBinding) => Promise<AppForm | undefined>;
}

export class ParsedCommand {
    state: string = ParseState.Start;
    command: string;
    i = 0;
    incomplete = '';
    incompleteStart = 0;
    binding: AppBinding | undefined;
    form: AppForm | undefined;
    formsCache: FormsCache;
    field: AppField | undefined;
    position = 0;
    values: {[name: string]: string} = {};
    location = '';
    error = '';
    intl: typeof intlShape;

    constructor(command: string, formsCache: FormsCache, intl: any) {
        this.command = command;
        this.formsCache = formsCache || [];
        this.intl = intl;
    }

    asError = (message: string): ParsedCommand => {
        this.state = ParseState.Error;
        this.error = message;
        return this;
    };

    errorMessage = (): string => {
        return this.intl.formatMessage({
            id: 'apps.error.parser',
            defaultMessage: 'Parsing error: {error}.\n```\n{command}\n{space}^\n```',
        }, {
            error: this.error,
            command: this.command,
            space: ' '.repeat(this.i),
        });
    }

    // matchBinding finds the closest matching command binding.
    matchBinding = async (commandBindings: AppBinding[], autocompleteMode = false): Promise<ParsedCommand> => {
        if (commandBindings.length === 0) {
            return this.asError(this.intl.formatMessage({
                id: 'apps.error.parser.no_bindings',
                defaultMessage: 'No command bindings.',
            }));
        }
        let bindings = commandBindings;

        let done = false;
        while (!done) {
            let c = '';
            if (this.i < this.command.length) {
                c = this.command[this.i];
            }

            switch (this.state) {
            case ParseState.Start: {
                if (c !== '/') {
                    return this.asError(this.intl.formatMessage({
                        id: 'apps.error.parser.no_slash_start',
                        defaultMessage: 'Command must start with a `/`.',
                    }));
                }
                this.i++;
                this.incomplete = '';
                this.incompleteStart = this.i;
                this.state = ParseState.Command;
                break;
            }

            case ParseState.Command: {
                switch (c) {
                case '': {
                    if (autocompleteMode) {
                        // Finish in the Command state, 'incomplete' will have the query string
                        done = true;
                    } else {
                        this.state = ParseState.EndCommand;
                    }
                    break;
                }
                case ' ':
                case '\t': {
                    this.state = ParseState.EndCommand;
                    break;
                }
                default:
                    this.incomplete += c;
                    this.i++;
                    break;
                }
                break;
            }

            case ParseState.EndCommand: {
                const binding = bindings.find((b: AppBinding) => b.label === this.incomplete.toLowerCase());
                if (!binding) {
                    // gone as far as we could, this token doesn't match a sub-command.
                    // return the state from the last matching binding
                    done = true;
                    break;
                }
                this.binding = binding;
                this.location += '/' + binding.label;
                bindings = binding.bindings || [];
                this.state = ParseState.CommandSeparator;
                break;
            }

            case ParseState.CommandSeparator: {
                if (c === '') {
                    done = true;
                }

                switch (c) {
                case ' ':
                case '\t': {
                    this.i++;
                    break;
                }
                default: {
                    this.incomplete = '';
                    this.incompleteStart = this.i;
                    this.state = ParseState.Command;
                    break;
                }
                }
                break;
            }

            default: {
                return this.asError(this.intl.formatMessage({
                    id: 'apps.error.parser.unexpected_state',
                    defaultMessage: 'Unreachable: Unexpected state in matchBinding: `{state}`.',
                }, {
                    state: this.state,
                }));
            }
            }
        }

        if (!this.binding) {
            return this.asError(this.intl.formatMessage({
                id: 'apps.error.parser.no_match',
                defaultMessage: '`{command}`: no match.',
            }, {
                command: this.command,
            }));
        }

        this.form = this.binding.form;
        if (!this.form) {
            this.form = await this.formsCache.getForm(this.location, this.binding);
        }

        return this;
    }

    // parseForm parses the rest of the command using the previously matched form.
    parseForm = (autocompleteMode = false): ParsedCommand => {
        if (this.state === ParseState.Error || !this.form) {
            return this;
        }

        let fields: AppField[] = [];
        if (this.form.fields) {
            fields = this.form.fields;
        }

        this.state = ParseState.StartParameter;
        this.i = this.incompleteStart || 0;
        let flagEqualsUsed = false;
        let escaped = false;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            let c = '';
            if (this.i < this.command.length) {
                c = this.command[this.i];
            }

            switch (this.state) {
            case ParseState.StartParameter: {
                switch (c) {
                case '':
                    return this;
                case '-': {
                    // Named parameter (aka Flag). Flag1 consumes the optional second '-'.
                    this.state = ParseState.Flag1;
                    this.i++;
                    break;
                }
                default: {
                    // Positional parameter.
                    this.position++;
                    // eslint-disable-next-line no-loop-func
                    const field = fields.find((f: AppField) => f.position === this.position);
                    if (!field) {
                        return this.asError(this.intl.formatMessage({
                            id: 'apps.error.parser.no_argument_pos_x',
                            defaultMessage: 'Command does not accept {positionX} positional arguments.',
                        }, {
                            positionX: this.position,
                        }));
                    }
                    this.field = field;
                    this.state = ParseState.StartValue;
                    break;
                }
                }
                break;
            }

            case ParseState.ParameterSeparator: {
                this.incompleteStart = this.i;
                switch (c) {
                case '':
                    this.state = ParseState.StartParameter;
                    return this;
                case ' ':
                case '\t': {
                    this.i++;
                    break;
                }
                default:
                    this.state = ParseState.StartParameter;
                    break;
                }
                break;
            }

            case ParseState.Flag1: {
                // consume the optional second '-'
                if (c === '-') {
                    this.i++;
                }
                this.state = ParseState.Flag;
                this.incomplete = '';
                this.incompleteStart = this.i;
                flagEqualsUsed = false;
                break;
            }

            case ParseState.Flag: {
                if (c === '' && autocompleteMode) {
                    return this;
                }

                switch (c) {
                case '':
                case ' ':
                case '\t':
                case '=': {
                    const field = fields.find((f) => f.label === this.incomplete.toLowerCase());
                    if (!field) {
                        return this.asError(this.intl.formatMessage({
                            id: 'apps.error.parser.unexpected_flag',
                            defaultMessage: 'Command does not accept flag `{flagName}`.',
                        }, {
                            flagName: this.incomplete,
                        }));
                    }
                    this.state = ParseState.FlagValueSeparator;
                    this.field = field;
                    this.incomplete = '';
                    break;
                }
                default: {
                    this.incomplete += c;
                    this.i++;
                    break;
                }
                }
                break;
            }

            case ParseState.FlagValueSeparator: {
                this.incompleteStart = this.i;
                switch (c) {
                case '': {
                    if (autocompleteMode) {
                        return this;
                    }
                    this.state = ParseState.StartValue;
                    break;
                }
                case ' ':
                case '\t': {
                    this.i++;
                    break;
                }
                case '=': {
                    if (flagEqualsUsed) {
                        return this.asError(this.intl.formatMessage({
                            id: 'apps.error.parser.multiple_equal',
                            defaultMessage: 'Multiple `=` signs are not allowed.',
                        }));
                    }
                    flagEqualsUsed = true;
                    this.i++;
                    break;
                }
                default: {
                    this.state = ParseState.StartValue;
                }
                }
                break;
            }

            case ParseState.StartValue: {
                this.incomplete = '';
                this.incompleteStart = this.i;
                switch (c) {
                case '"': {
                    this.state = ParseState.QuotedValue;
                    this.i++;
                    break;
                }
                case '`': {
                    this.state = ParseState.TickValue;
                    this.i++;
                    break;
                }
                case ' ':
                case '\t':
                    return this.asError(this.intl.formatMessage({
                        id: 'apps.error.parser.unexpected_whitespace',
                        defaultMessage: 'Unreachable: Unexpected whitespace.',
                    }));
                default: {
                    this.state = ParseState.NonspaceValue;
                    break;
                }
                }
                break;
            }

            case ParseState.NonspaceValue: {
                switch (c) {
                case '':
                case ' ':
                case '\t': {
                    this.state = ParseState.EndValue;
                    break;
                }
                default: {
                    this.incomplete += c;
                    this.i++;
                    break;
                }
                }
                break;
            }

            case ParseState.QuotedValue: {
                switch (c) {
                case '': {
                    if (!autocompleteMode) {
                        return this.asError(this.intl.formatMessage({
                            id: 'apps.error.parser.missing_quote',
                            defaultMessage: 'Matching double quote expected before end of input.',
                        }));
                    }
                    return this;
                }
                case '"': {
                    if (this.incompleteStart === this.i - 1) {
                        return this.asError(this.intl.formatMessage({
                            id: 'apps.error.parser.empty_value',
                            defaultMessage: 'empty values are not allowed',
                        }));
                    }
                    this.i++;
                    this.state = ParseState.EndQuotedValue;
                    break;
                }
                case '\\': {
                    escaped = true;
                    this.i++;
                    break;
                }
                default: {
                    this.incomplete += c;
                    this.i++;
                    if (escaped) {
                        //TODO: handle \n, \t, other escaped chars
                        escaped = false;
                    }
                    break;
                }
                }
                break;
            }

            case ParseState.TickValue: {
                switch (c) {
                case '': {
                    if (!autocompleteMode) {
                        return this.asError(this.intl.formatMessage({
                            id: 'apps.error.parser.missing_tick',
                            defaultMessage: 'Matching tick quote expected before end of input.',
                        }));
                    }
                    return this;
                }
                case '`': {
                    if (this.incompleteStart === this.i - 1) {
                        return this.asError(this.intl.formatMessage({
                            id: 'apps.error.parser.empty_value',
                            defaultMessage: 'empty values are not allowed',
                        }));
                    }
                    this.i++;
                    this.state = ParseState.EndTickedValue;
                    break;
                }
                default: {
                    this.incomplete += c;
                    this.i++;
                    break;
                }
                }
                break;
            }

            case ParseState.EndTickedValue:
            case ParseState.EndQuotedValue:
            case ParseState.EndValue: {
                if (!this.field) {
                    return this.asError(this.intl.formatMessage({
                        id: 'apps.error.parser.missing_field_value',
                        defaultMessage: 'Field value Expected.',
                    }));
                }

                // special handling for optional BOOL values ('--boolflag true'
                // vs '--boolflag next-positional' vs '--boolflag
                // --next-flag...')
                if (this.field.type === AppFieldTypes.BOOL &&
                    ((autocompleteMode && !'true'.startsWith(this.incomplete) && !'false'.startsWith(this.incomplete)) ||
                    (!autocompleteMode && this.incomplete !== 'true' && this.incomplete !== 'false'))) {
                    // reset back where the value started, and treat as a new parameter
                    this.i = this.incompleteStart;
                    this.values![this.field.name] = 'true';
                    this.state = ParseState.StartParameter;
                } else {
                    if (autocompleteMode && c === '') {
                        return this;
                    }
                    this.values![this.field.name] = this.incomplete;
                    this.incomplete = '';
                    this.incompleteStart = this.i;
                    if (c === '') {
                        return this;
                    }
                    this.state = ParseState.ParameterSeparator;
                }
                break;
            }
            }
        }
    }
}

export class AppCommandParser {
    private store: Store;
    private channelID: string;
    private rootPostID?: string;
    private intl: typeof intlShape;

    forms: {[location: string]: AppForm} = {};

    constructor(store: Store|null, intl: typeof intlShape, channelID: string, rootPostID = '') {
        this.store = store || getStore() as Store;
        this.channelID = channelID;
        this.rootPostID = rootPostID;
        this.intl = intl;
    }

    // composeCallFromCommand creates the form submission call
    public composeCallFromCommand = async (command: string): Promise<AppCallRequest | null> => {
        let parsed = new ParsedCommand(command, this, this.intl);

        const commandBindings = this.getCommandBindings();
        if (!commandBindings) {
            this.displayError(this.intl.formatMessage({
                id: 'apps.error.command.no_bindings',
                defaultMessage: 'No command bindings.',
            }));
            return null;
        }

        parsed = await parsed.matchBinding(commandBindings, false);
        parsed = parsed.parseForm(false);
        if (parsed.state === ParseState.Error) {
            this.displayError(parsed.errorMessage());
            return null;
        }

        const missing = this.getMissingFields(parsed);
        if (missing.length > 0) {
            const missingStr = missing.map((f) => f.label).join(', ');
            this.displayError(this.intl.formatMessage({
                id: 'apps.error.command.field_missing',
                defaultMessage: 'Required fields missing: `{fieldName}`.',
            }, {
                fieldName: missingStr,
            }));
            return null;
        }

        return this.composeCallFromParsed(parsed);
    }

    // getSuggestionsBase is a synchronous function that returns results for base commands
    public getSuggestionsBase = (pretext: string): AutocompleteSuggestion[] => {
        const command = pretext.toLowerCase();
        const result: AutocompleteSuggestion[] = [];

        const bindings = this.getCommandBindings();
        for (const binding of bindings) {
            let base = binding.app_id;
            if (!base) {
                continue;
            }

            if (base[0] !== '/') {
                base = '/' + base;
            }
            if (base.startsWith(command)) {
                result.push({
                    Suggestion: base,
                    Complete: base.substring(1),
                    Description: binding.description || '',
                    Hint: binding.hint || '',
                    IconData: binding.icon || '',
                });
            }
        }

        return result;
    }

    // getSuggestions returns suggestions for subcommands and/or form arguments
    public getSuggestions = async (pretext: string): Promise<AutocompleteSuggestion[]> => {
        let parsed = new ParsedCommand(pretext, this, this.intl);

        const commandBindings = this.getCommandBindings();
        if (!commandBindings) {
            return [];
        }

        parsed = await parsed.matchBinding(commandBindings, true);
        let suggestions: AutocompleteSuggestion[] = [];
        if (parsed.state === ParseState.Command) {
            suggestions = this.getCommandSuggestions(parsed);
        }

        if (parsed.form || parsed.incomplete) {
            parsed = parsed.parseForm(true);
            const argSuggestions = await this.getParameterSuggestions(parsed);
            suggestions = suggestions.concat(argSuggestions);
        }

        // Add "Execute Current Command" suggestion
        // TODO get full text from SuggestionBox
        const executableStates: string[] = [
            ParseState.EndCommand,
            ParseState.CommandSeparator,
            ParseState.StartParameter,
            ParseState.ParameterSeparator,
            ParseState.EndValue,
        ];
        const call = parsed.form?.call || parsed.binding?.call || parsed.binding?.form?.call;
        const hasRequired = this.getMissingFields(parsed).length === 0;
        const hasValue = (parsed.state !== ParseState.EndValue || (parsed.field && parsed.values[parsed.field.name] !== undefined));

        if (executableStates.includes(parsed.state) && call && hasRequired && hasValue) {
            const execute = getExecuteSuggestion(parsed);
            if (execute) {
                suggestions = [execute, ...suggestions];
            }
        }

        return suggestions.map((suggestion) => this.decorateSuggestionComplete(parsed, suggestion));
    }

    // composeCallFromParsed creates the form submission call
    composeCallFromParsed = async (parsed: ParsedCommand): Promise<AppCallRequest | null> => {
        if (!parsed.binding) {
            return null;
        }

        const call = parsed.form?.call || parsed.binding.call;
        if (!call) {
            return null;
        }

        const values: AppCallValues = parsed.values;
        const ok = await this.expandOptions(parsed, values);

        if (!ok) {
            return null;
        }

        const context = this.getAppContext(parsed.binding.app_id);
        return createCallRequest(call, context, {}, values, parsed.command);
    }

    expandOptions = async (parsed: ParsedCommand, values: AppCallValues) => {
        if (!parsed.form || !parsed.form.fields) {
            return true;
        }

        let ok = true;
        await Promise.all(parsed.form.fields.map(async (f) => {
            if (!values[f.name]) {
                return;
            }
            switch (f.type) {
            case AppFieldTypes.DYNAMIC_SELECT:
                values[f.name] = {label: '', value: values[f.name]};
                break;
            case AppFieldTypes.STATIC_SELECT: {
                const option = f.options?.find((o) => (o.value === values[f.name]));
                if (!option) {
                    ok = false;
                    this.displayError(this.intl.formatMessage({
                        id: 'apps.error.command.unknown_option',
                        defaultMessage: 'Unknown option for field `{fieldName}`: `{option}`.',
                    }, {
                        fieldName: f.name,
                        option: values[f.name],
                    }));
                    return;
                }
                values[f.name] = option;
                break;
            }
            case AppFieldTypes.USER: {
                let userName = values[f.name] as string;
                if (userName[0] === '@') {
                    userName = userName.substr(1);
                }
                let user = selectUserByUsername(this.store.getState(), userName);
                if (!user) {
                    const dispatchResult = await this.store.dispatch(getUserByUsername(userName) as any);
                    if ('error' in dispatchResult) {
                        ok = false;
                        this.displayError(this.intl.formatMessage({
                            id: 'apps.error.command.unknown_user',
                            defaultMessage: 'Unknown user for field `{fieldName}`: `{option}`.',
                        }, {
                            fieldName: f.name,
                            option: values[f.name],
                        }));
                        return;
                    }
                    user = dispatchResult.data;
                }
                values[f.name] = {label: user.username, value: user.id};
                break;
            }
            case AppFieldTypes.CHANNEL: {
                let channelName = values[f.name] as string;
                if (channelName[0] === '~') {
                    channelName = channelName.substr(1);
                }
                let channel = selectChannelByName(this.store.getState(), channelName);
                if (!channel) {
                    const dispatchResult = await this.store.dispatch(getChannelByNameAndTeamName(getCurrentTeam(this.store.getState()).name, channelName) as any);
                    if ('error' in dispatchResult) {
                        ok = false;
                        this.displayError(this.intl.formatMessage({
                            id: 'apps.error.command.unknown_channel',
                            defaultMessage: 'Unknown channel for field `{fieldName}`: `{option}`.',
                        }, {
                            fieldName: f.name,
                            option: values[f.name],
                        }));
                    }
                    channel = dispatchResult.data;
                }
                values[f.name] = {label: channel?.display_name, value: channel?.id};
                break;
            }
            }
        }));

        return ok;
    }

    // decorateSuggestionComplete applies the necessary modifications for a suggestion to be processed
    decorateSuggestionComplete = (parsed: ParsedCommand, choice: AutocompleteSuggestion): AutocompleteSuggestion => {
        if (choice.Complete && choice.Complete.endsWith(EXECUTE_CURRENT_COMMAND_ITEM_ID)) {
            return choice as AutocompleteSuggestion;
        }

        let goBackSpace = 0;
        if (choice.Complete === '') {
            goBackSpace = 1;
        }
        let complete = parsed.command.substring(0, parsed.incompleteStart - goBackSpace);
        complete += choice.Complete || choice.Suggestion;
        choice.Hint = choice.Hint || '';
        complete = complete.substring(1);

        return {
            ...choice,
            Complete: complete,
        };
    }

    // getCommandBindings returns the commands in the redux store.
    // They are grouped by app id since each app has one base command
    getCommandBindings = (): AppBinding[] => {
        const bindings = getAppsBindings(this.store.getState(), AppBindingLocations.COMMAND);
        return bindings;
    }

    // getChannel gets the channel in which the user is typing the command
    getChannel = (): Channel | null => {
        const state = this.store.getState();
        return getChannel(state, this.channelID);
    }

    setChannelContext = (channelID: string, rootPostID?: string) => {
        this.channelID = channelID;
        this.rootPostID = rootPostID;
    }

    // isAppCommand determines if subcommand/form suggestions need to be returned
    isAppCommand = (pretext: string): boolean => {
        const command = pretext.toLowerCase();
        for (const binding of this.getCommandBindings()) {
            let base = binding.app_id;
            if (!base) {
                continue;
            }

            if (base[0] !== '/') {
                base = '/' + base;
            }

            if (command.startsWith(base + ' ')) {
                return true;
            }
        }
        return false;
    }

    // getAppContext collects post/channel/team info for performing calls
    getAppContext = (appID: string): AppContext => {
        const context: AppContext = {
            app_id: appID,
            location: AppBindingLocations.COMMAND,
            root_id: this.rootPostID,
        };

        const channel = this.getChannel();
        if (!channel) {
            return context;
        }

        context.channel_id = channel.id;
        context.team_id = channel.team_id || getCurrentTeamId(this.store.getState());

        return context;
    }

    // fetchForm unconditionaly retrieves the form for the given binding (subcommand)
    fetchForm = async (binding: AppBinding): Promise<AppForm | undefined> => {
        if (!binding.call) {
            return undefined;
        }

        const payload = createCallRequest(
            binding.call,
            this.getAppContext(binding.app_id),
        );

        const res = await this.store.dispatch(doAppCall(payload, AppCallTypes.FORM, this.intl)) as {data: AppCallResponse};
        const callResponse = res.data;
        switch (callResponse.type) {
        case AppCallResponseTypes.FORM:
            break;
        case AppCallResponseTypes.ERROR:
            this.displayError(callResponse.error || this.intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error.',
            }));
            return undefined;
        case AppCallResponseTypes.NAVIGATE:
        case AppCallResponseTypes.OK:
            this.displayError(this.intl.formatMessage({
                id: 'apps.error.responses.unexpected_type',
                defaultMessage: 'App response type was not expected. Response type: {type}',
            }, {
                type: callResponse.type,
            }));
            return undefined;
        default:
            this.displayError(this.intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResponse.type,
            }));
            return undefined;
        }

        return res.data.form;
    }

    getForm = async (location: string, binding: AppBinding): Promise<AppForm | undefined> => {
        const form = this.forms[location];
        if (form) {
            return form;
        }

        const fetched = await this.fetchForm(binding);
        if (fetched) {
            this.forms[location] = fetched;
        }
        return fetched;
    }

    // displayError shows an error that was caught by the parser
    displayError = (err: any): void => {
        let errStr = err as string;
        if (err.message) {
            errStr = err.message;
        }

        displayError(this.intl, errStr);
    }

    // getSuggestionsForSubCommands returns suggestions for a subcommand's name
    getCommandSuggestions = (parsed: ParsedCommand): AutocompleteSuggestion[] => {
        if (!parsed.binding?.bindings?.length) {
            return [];
        }
        const bindings = parsed.binding.bindings;
        const result: AutocompleteSuggestion[] = [];

        bindings.forEach((b) => {
            if (b.label.toLowerCase().startsWith(parsed.incomplete.toLowerCase())) {
                result.push({
                    Complete: b.label,
                    Suggestion: b.label,
                    Description: b.description || '',
                    Hint: b.hint || '',
                    IconData: b.icon || '',
                });
            }
        });

        return result;
    }

    // getParameterSuggestions computes suggestions for positional argument values, flag names, and flag argument values
    getParameterSuggestions = async (parsed: ParsedCommand): Promise<AutocompleteSuggestion[]> => {
        switch (parsed.state) {
        case ParseState.StartParameter: {
            // see if there's a matching positional field
            const positional = parsed.form?.fields?.find((f: AppField) => f.position === parsed.position + 1);
            if (positional) {
                parsed.field = positional;
                return this.getValueSuggestions(parsed);
            }
            return this.getFlagNameSuggestions(parsed);
        }

        case ParseState.Flag:
            return this.getFlagNameSuggestions(parsed);

        case ParseState.EndValue:
        case ParseState.FlagValueSeparator:
        case ParseState.NonspaceValue:
            return this.getValueSuggestions(parsed);
        case ParseState.EndQuotedValue:
        case ParseState.QuotedValue:
            return this.getValueSuggestions(parsed, '"');
        case ParseState.EndTickedValue:
        case ParseState.TickValue:
            return this.getValueSuggestions(parsed, '`');
        }
        return [];
    }

    // getMissingFields collects the required fields that were not supplied in a submission
    getMissingFields = (parsed: ParsedCommand): AppField[] => {
        const form = parsed.form;
        if (!form) {
            return [];
        }

        const missing: AppField[] = [];

        const values = parsed.values || [];
        const fields = form.fields || [];
        for (const field of fields) {
            if (field.is_required && !values[field.name]) {
                missing.push(field);
            }
        }

        return missing;
    }

    // getFlagNameSuggestions returns suggestions for flag names
    getFlagNameSuggestions = (parsed: ParsedCommand): AutocompleteSuggestion[] => {
        if (!parsed.form || !parsed.form.fields || !parsed.form.fields.length) {
            return [];
        }

        // There have been 0 to 2 dashes in the command prior to this call, adjust.
        let prefix = '--';
        for (let i = parsed.incompleteStart - 1; i > 0 && i >= parsed.incompleteStart - 2 && parsed.command[i] === '-'; i--) {
            prefix = prefix.substring(1);
        }

        const applicable = parsed.form.fields.filter((field) => field.label && field.label.startsWith(parsed.incomplete.toLowerCase()) && !parsed.values[field.name]);
        if (applicable) {
            return applicable.map((f) => {
                return {
                    Complete: prefix + (f.label || f.name),
                    Suggestion: '--' + (f.label || f.name),
                    Description: f.description || '',
                    Hint: f.hint || '',
                    IconData: parsed.binding?.icon || '',
                };
            });
        }

        return [];
    }

    // getSuggestionsForField gets suggestions for a positional or flag field value
    getValueSuggestions = async (parsed: ParsedCommand, delimiter?: string): Promise<AutocompleteSuggestion[]> => {
        if (!parsed || !parsed.field) {
            return [];
        }
        const f = parsed.field;

        switch (f.type) {
        case AppFieldTypes.USER:
            return this.getUserSuggestions(parsed);
        case AppFieldTypes.CHANNEL:
            return this.getChannelSuggestions(parsed);
        case AppFieldTypes.BOOL:
            return this.getBooleanSuggestions(parsed);
        case AppFieldTypes.DYNAMIC_SELECT:
            return this.getDynamicSelectSuggestions(parsed, delimiter);
        case AppFieldTypes.STATIC_SELECT:
            return this.getStaticSelectSuggestions(parsed, delimiter);
        }

        let complete = parsed.incomplete;
        if (complete && delimiter) {
            complete = delimiter + complete + delimiter;
        }

        return [{
            Complete: complete,
            Suggestion: parsed.incomplete,
            Description: f.description || '',
            Hint: '',
            IconData: parsed.binding?.icon || '',
        }];
    }

    // getStaticSelectSuggestions returns suggestions specified in the field's options property
    getStaticSelectSuggestions = (parsed: ParsedCommand, delimiter?: string): AutocompleteSuggestion[] => {
        const f = parsed.field as AutocompleteStaticSelect;
        const opts = f.options?.filter((opt) => opt.label.toLowerCase().startsWith(parsed.incomplete.toLowerCase()));
        if (!opts?.length) {
            return [{
                Complete: '',
                Suggestion: '',
                Hint: '',
                Description: this.intl.formatMessage({
                    id: 'apps.suggestion.no_static',
                    defaultMessage: 'No matching options.',
                }),
                IconData: '',
            }];
        }
        return opts.map((opt) => {
            let complete = opt.value;
            if (delimiter) {
                complete = delimiter + complete + delimiter;
            } else if (isMultiword(opt.value)) {
                complete = '`' + complete + '`';
            }
            return {
                Complete: complete,
                Suggestion: opt.label,
                Hint: f.hint || '',
                Description: f.description || '',
                IconData: opt.icon_data || parsed.binding?.icon || '',
            };
        });
    }

    // getDynamicSelectSuggestions fetches and returns suggestions from the server
    getDynamicSelectSuggestions = async (parsed: ParsedCommand, delimiter?: string): Promise<AutocompleteSuggestion[]> => {
        const f = parsed.field;
        if (!f) {
            // Should never happen
            return this.makeSuggestionError('Unexpected error');
        }

        const call = await this.composeCallFromParsed(parsed);
        if (!call) {
            return this.makeSuggestionError(this.intl.formatMessage({
                id: 'apps.error.lookup.cannot_compose',
                defaultMessage: 'Cannot compose lookup call.',
            }));
        }
        call.selected_field = f.name;
        call.query = parsed.incomplete;

        type ResponseType = {items: AppSelectOption[]};
        const res = await this.store.dispatch(doAppCall<ResponseType>(call, AppCallTypes.LOOKUP, this.intl)) as {data: AppCallResponse<ResponseType>};
        const callResponse = res.data;

        switch (callResponse.type) {
        case AppCallResponseTypes.OK:
            break;
        case AppCallResponseTypes.ERROR:
            return this.makeSuggestionError(callResponse.error || this.intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error.',
            }));
        case AppCallResponseTypes.NAVIGATE:
        case AppCallResponseTypes.FORM:
            return this.makeSuggestionError(this.intl.formatMessage({
                id: 'apps.error.responses.unexpected_type',
                defaultMessage: 'App response type was not expected. Response type: {type}',
            }, {
                type: callResponse.type,
            }));
        default:
            return this.makeSuggestionError(this.intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResponse.type,
            }));
        }

        const items = callResponse?.data?.items;
        if (!items?.length) {
            return [{
                Complete: '',
                Suggestion: '',
                Hint: '',
                IconData: '',
                Description: this.intl.formatMessage({
                    id: 'apps.suggestion.no_dynamic',
                    defaultMessage: 'Received no data for dynamic suggestions',
                }),
            }];
        }

        return items.map((s): AutocompleteSuggestion => {
            let complete = s.value;
            if (delimiter) {
                complete = delimiter + complete + delimiter;
            } else if (isMultiword(s.value)) {
                complete = '`' + complete + '`';
            }
            return ({
                Complete: complete,
                Description: s.label,
                Suggestion: s.value,
                Hint: '',
                IconData: s.icon_data || parsed.binding?.icon || '',
            });
        });
    }

    makeSuggestionError = (message: string): AutocompleteSuggestion[] => {
        const errMsg = this.intl.formatMessage({
            id: 'apps.error',
            defaultMessage: 'Error: {error}',
        }, {
            error: message,
        });
        return [{
            Complete: '',
            Suggestion: '',
            Hint: '',
            IconData: '',
            Description: errMsg,
        }];
    }

    // getUserSuggestions returns a suggestion with `@` if the user has not started typing
    getUserSuggestions = (parsed: ParsedCommand): AutocompleteSuggestion[] => {
        if (parsed.incomplete.trim().length === 0) {
            return [{
                Complete: '',
                Suggestion: '',
                Description: parsed.field?.description || '',
                Hint: parsed.field?.hint || '@username',
                IconData: parsed.binding?.icon || '',
            }];
        }

        return [];
    }

    // getChannelSuggestions returns a suggestion with `~` if the user has not started typing
    getChannelSuggestions = (parsed: ParsedCommand): AutocompleteSuggestion[] => {
        if (parsed.incomplete.trim().length === 0) {
            return [{
                Complete: '',
                Suggestion: '',
                Description: parsed.field?.description || '',
                Hint: parsed.field?.hint || '~channelname',
                IconData: parsed.binding?.icon || '',
            }];
        }

        return [];
    }

    // getBooleanSuggestions returns true/false suggestions
    getBooleanSuggestions = (parsed: ParsedCommand): AutocompleteSuggestion[] => {
        const suggestions: AutocompleteSuggestion[] = [];

        if ('true'.startsWith(parsed.incomplete)) {
            suggestions.push({
                Complete: 'true',
                Suggestion: 'true',
                Description: parsed.field?.description || '',
                Hint: parsed.field?.hint || '',
                IconData: parsed.binding?.icon || '',
            });
        }
        if ('false'.startsWith(parsed.incomplete)) {
            suggestions.push({
                Complete: 'false',
                Suggestion: 'false',
                Description: parsed.field?.description || '',
                Hint: parsed.field?.hint || '',
                IconData: parsed.binding?.icon || '',
            });
        }
        return suggestions;
    }
}

function isMultiword(value: string) {
    if (value.indexOf(' ') !== -1) {
        return true;
    }

    if (value.indexOf('\t') !== -1) {
        return true;
    }

    return false;
}
