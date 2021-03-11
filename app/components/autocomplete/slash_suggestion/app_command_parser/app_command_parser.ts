// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import keyMirror from '@mm-redux/utils/key_mirror';

import {
    AppCall,
    AppBinding,
    AppField,
    AppSelectOption,
    AppCallResponse,
    AppContext,
    AppForm,
    AutocompleteSuggestion,
    AutocompleteStaticSelect,
    AppLookupCallValues,
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
    displayError,
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

    constructor(command: string, formsCache: FormsCache) {
        this.command = command;
        this.formsCache = formsCache || [];
    }

    asError = (message: string): ParsedCommand => {
        this.state = ParseState.Error;
        this.error = message;
        return this;
    };

    errorMessage = (): string => {
        return 'Parsing error: ' + this.error + '.\n```\n' + this.command + '\n' + ' '.repeat(this.i) + '^\n```';
    }

    // matchBinding finds the closest matching command binding.
    matchBinding = async (commandBindings: AppBinding[], autocompleteMode = false): Promise<ParsedCommand> => {
        if (commandBindings.length === 0) {
            return this.asError('no command bindings');
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
                    return this.asError('command must start with a /');
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

                case '':
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
                return this.asError('unreachable: unexpected state in matchBinding: ' + this.state);
            }
            }
        }

        if (!this.binding) {
            return this.asError('"' + this.command + '": no match');
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
                        return this.asError('command does not accept ' + this.position + ' positional arguments');
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
                        return this.asError('command does not accept flag ' + this.incomplete);
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
                        return this.asError('multiple = signs are not allowed');
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
                    return this.asError('unreachable: unexpected whitespace');
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
                        return this.asError('matching double quote expected before end of input');
                    }
                    return this;
                }
                case '"': {
                    if (this.incompleteStart === this.i - 1) {
                        return this.asError('empty values are not allowed');
                    }
                    this.i++;
                    this.state = ParseState.EndValue;
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
                        return this.asError('matching tick quote expected before end of input');
                    }
                    return this;
                }
                case '`': {
                    if (this.incompleteStart === this.i - 1) {
                        return this.asError('empty values are not allowed');
                    }
                    this.i++;
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

            case ParseState.EndValue: {
                if (!this.field) {
                    return this.asError('field value expected');
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

    forms: {[location: string]: AppForm} = {};

    constructor(store: Store|null, channelID: string, rootPostID = '') {
        this.store = store || getStore() as Store;
        this.channelID = channelID;
        this.rootPostID = rootPostID;
    }

    // composeCallFromCommand creates the form submission call
    public composeCallFromCommand = async (command: string): Promise<AppCall | null> => {
        let parsed = new ParsedCommand(command, this);

        const commandBindings = this.getCommandBindings();
        if (!commandBindings) {
            this.displayError('no command bindings');
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
            this.displayError('Required fields missing: ' + missingStr);
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

            base = '/' + base;
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
        let parsed = new ParsedCommand(pretext, this);

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
    composeCallFromParsed = (parsed: ParsedCommand): AppCall | null => {
        if (!parsed.binding) {
            return null;
        }

        const call = parsed.form?.call || parsed.binding.call;
        if (!call) {
            return null;
        }

        return {
            ...call,
            type: AppCallTypes.SUBMIT,
            context: {
                ...this.getAppContext(),
                app_id: parsed.binding.app_id,
            },
            values: parsed.values,
            raw_command: parsed.command,
        };
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

            base = '/' + base;
            if (command.startsWith(base + ' ')) {
                return true;
            }
        }
        return false;
    }

    // getAppContext collects post/channel/team info for performing calls
    getAppContext = (): Partial<AppContext> | null => {
        const channel = this.getChannel();
        if (!channel) {
            return null;
        }

        const teamID = channel.team_id || getCurrentTeamId(this.store.getState());

        return {
            channel_id: channel.id,
            team_id: teamID,
            root_id: this.rootPostID,
            location: AppBindingLocations.COMMAND,
        };
    }

    // fetchForm unconditionaly retrieves the form for the given binding (subcommand)
    fetchForm = async (binding: AppBinding): Promise<AppForm | undefined> => {
        if (!binding.call) {
            return undefined;
        }

        const payload: AppCall = {
            ...binding.call,
            type: AppCallTypes.FORM,
            context: {
                ...this.getAppContext(),
                app_id: binding.app_id,
            },
        };

        const res = await this.store.dispatch(doAppCall(payload, null)) as {data: AppCallResponse, error?: Error};
        if (res.error) {
            this.displayError(res.error.message);
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
        displayError(errStr);
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
        case ParseState.QuotedValue:
            return this.getValueSuggestions(parsed, '"');
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
                let suffix = '';
                if (f.type === AppFieldTypes.USER) {
                    suffix = ' @';
                } else if (f.type === AppFieldTypes.CHANNEL) {
                    suffix = ' ~';
                }
                return {
                    Complete: prefix + (f.label || f.name) + suffix,
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
            return this.getDynamicSelectSuggestions(parsed);
        case AppFieldTypes.STATIC_SELECT:
            return this.getStaticSelectSuggestions(parsed);
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
    getStaticSelectSuggestions = (parsed: ParsedCommand): AutocompleteSuggestion[] => {
        const f = parsed.field as AutocompleteStaticSelect;
        const opts = f.options.filter((opt) => opt.label.toLowerCase().startsWith(parsed.incomplete.toLowerCase()));
        return opts.map((opt) => ({
            Complete: opt.label,
            Suggestion: opt.label,
            Hint: f.hint || '',
            Description: f.description || '',
            IconData: opt.icon_data || parsed.binding?.icon || '',
        }));
    }

    // getDynamicSelectSuggestions fetches and returns suggestions from the server
    getDynamicSelectSuggestions = async (parsed: ParsedCommand): Promise<AutocompleteSuggestion[]> => {
        const f = parsed.field;
        if (!f) {
            return [];
        }

        const values: AppLookupCallValues = {
            name: f.name,
            user_input: parsed.incomplete,
            values: parsed.values,
        };

        const payload = this.composeCallFromParsed(parsed);
        if (!payload) {
            return [];
        }
        payload.type = AppCallTypes.LOOKUP;
        payload.values = values;

        type ResponseType = {items: AppSelectOption[]};
        const res: {data?: AppCallResponse<ResponseType>} = await this.store.dispatch(doAppCall<ResponseType>(payload, null));
        const callResponse = res.data;

        if (callResponse?.type === AppCallResponseTypes.ERROR) {
            const errorMessage = callResponse.error || 'Unknown error.';
            this.displayError(errorMessage);
            return [];
        }

        const items = callResponse?.data?.items;
        if (!items) {
            return [];
        }

        return items.map((s): AutocompleteSuggestion => ({
            Complete: s.value,
            Description: s.label,
            Suggestion: s.value,
            Hint: '',
            IconData: s.icon_data || parsed.binding?.icon || '',
        }));
    }

    // getUserSuggestions returns a suggestion with `@` if the user has not started typing
    getUserSuggestions = (parsed: ParsedCommand): AutocompleteSuggestion[] => {
        if (parsed.incomplete.trim().length === 0) {
            return [{
                Complete: ' @',
                Suggestion: '@',
                Description: parsed.field?.description || '',
                Hint: parsed.field?.hint || '',
                IconData: parsed.binding?.icon || '',
            }];
        }

        return [];
    }

    // getChannelSuggestions returns a suggestion with `~` if the user has not started typing
    getChannelSuggestions = (parsed: ParsedCommand): AutocompleteSuggestion[] => {
        if (parsed.incomplete.trim().length === 0) {
            return [{
                Complete: ' ~',
                Suggestion: '~',
                Description: parsed.field?.description || '',
                Hint: parsed.field?.hint || '',
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
