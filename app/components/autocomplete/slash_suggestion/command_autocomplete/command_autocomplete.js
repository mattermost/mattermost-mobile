// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const AUTOCOMPLETE_ARG = {
    TEXT: 'TextInput',
    STATIC_LIST: 'StaticList',
    DYNAMIC_LIST: 'DynamicList',
};

export default class CommandAutocomplete {
    constructor(updateDynamicAutocompleteSuggestions) {
        this.updateDynamicAutocompleteSuggestions = updateDynamicAutocompleteSuggestions;
    }

    getSuggestions = (commands, dynamicArguments, inputParsed, inputToBeParsed) => {
        if (!commands) {
            return [];
        }
        let suggestions = [];
        const index = inputToBeParsed.indexOf(' ');
        if (index === -1) {// no space in input
            for (let i = 0; i < commands.length; i++) {
                if (commands[i].Trigger.startsWith(inputToBeParsed.toLowerCase())) {
                    const s = {
                        Complete: inputParsed + commands[i].Trigger,
                        Suggestion: commands[i].Trigger,
                        Description: commands[i].HelpText,
                        Hint: commands[i].Hint,
                    };
                    suggestions.push(s);
                }
            }
            return suggestions;
        }
        for (let i = 0; i < commands.length; i++) {
            if (commands[i].Trigger !== inputToBeParsed.substring(0, index).toLowerCase()) {
                continue;
            }
            const toBeParsed = inputToBeParsed.substring(index + 1);
            const parsed = inputParsed + inputToBeParsed.substring(0, index + 1);
            if (!commands[i].Arguments || commands[i].Arguments.length === 0) {
                // Seek recursively in subcommands
                const subSuggestions = this.getSuggestions(commands[i].SubCommands, dynamicArguments, parsed, toBeParsed);
                suggestions = suggestions.concat(subSuggestions);
                continue;
            }
            const {
                found: parsedFound,
                suggestions: parsedSuggestions,
            } = this.parseArguments(commands[i].Arguments, dynamicArguments, parsed, toBeParsed);
            if (parsedFound) {
                suggestions = suggestions.concat(parsedSuggestions);
            }
        }
        return suggestions;
    }

    parseArguments = (args, dynamicArguments, parsed, toBeParsed) => {
        let suggestions = [];
        if (!args || args.length === 0) {
            return {
                found: false,
                parsed,
                toBeParsed,
                suggestions: [],
            };
        }
        if (args[0].Required) {
            const {
                found: parsedFound,
                parsed: changedParsed,
                toBeParsed: changedToBeParsed,
                suggestions: parsedSuggestions,
            } = this.parseArgument(args[0], dynamicArguments, parsed, toBeParsed);
            if (parsedFound) {
                suggestions = suggestions.concat(parsedSuggestions);
                return {
                    found: true,
                    parsed: changedParsed,
                    toBeParsed: changedToBeParsed,
                    suggestions,
                };
            }
            return this.parseArguments(args.slice(1), dynamicArguments, changedParsed, changedToBeParsed);
        }

        // Handling optional arguments. Optional argument can be inputted or not,
        // so we have to pase both cases recursively and output combined suggestions.
        const parsedArgument = this.parseArgument(args[0], dynamicArguments, parsed, toBeParsed);
        let {
            found: foundWithOptional,
            parsed: changedParsedWithOptional,
            toBeParsed: changedToBeParsedWithOptional,
        } = parsedArgument;
        const {suggestions: suggestionsWithOptional} = parsedArgument;
        if (foundWithOptional) {
            suggestions = suggestions.concat(suggestionsWithOptional);
        } else {
            const {
                found: foundWithOptionalRest,
                parsed: changedParsedWithOptionalRest,
                toBeParsed: changedToBeParsedWithOptionalRest,
                suggestions: suggestionsWithOptionalRest,
            } = this.parseArguments(args.slice(1), dynamicArguments, changedParsedWithOptional, changedToBeParsedWithOptional);
            if (foundWithOptionalRest) {
                suggestions = suggestions.concat(suggestionsWithOptionalRest);
            }
            foundWithOptional = foundWithOptionalRest;
            changedParsedWithOptional = changedParsedWithOptionalRest;
            changedToBeParsedWithOptional = changedToBeParsedWithOptionalRest;
        }

        const {
            found: foundWithoutOptional,
            parsed: changedParsedWithoutOptional,
            toBeParsed: changedToBeParsedWithoutOptional,
            suggestions: suggestionsWithoutOptional,
        } = this.parseArguments(args.slice(1), dynamicArguments, parsed, toBeParsed);
        if (foundWithoutOptional) {
            suggestions = suggestions.concat(suggestionsWithoutOptional);
        }

        // if suggestions were found we can return them
        if (foundWithOptional || foundWithoutOptional) {
            return {
                found: true,
                parsed: parsed + toBeParsed,
                toBeParsed: '',
                suggestions,
            };
        }

        // no suggestions found yet, check if optional argument was inputted
        if (changedParsedWithOptional !== parsed && changedToBeParsedWithOptional !== toBeParsed) {
            return {
                found: false,
                parsed: changedParsedWithOptional,
                toBeParsed: changedToBeParsedWithOptional,
                suggestions,
            };
        }

        // no suggestions and optional argument was not inputted
        return {
            found: foundWithoutOptional,
            parsed: changedParsedWithoutOptional,
            toBeParsed: changedToBeParsedWithoutOptional,
            suggestions,
        };
    }

    parseArgument = (arg, dynamicArguments, parsed, toBeParsed) => {
        let suggestions = [];
        let localParsed = parsed;
        let localToBeParsed = toBeParsed;

        if (!arg) {
            return {
                found: false,
                parsed: localParsed,
                toBeParsed: localToBeParsed,
                suggestions: [],
            };
        }
        if (arg.Name !== '') { //Parse the --name first
            const {
                found,
                parsed: changedParsed,
                toBeParsed: changedToBeParsed,
                suggestion,
            } = this.parseNamedArgument(arg, localParsed, localToBeParsed);
            if (found) {
                suggestions.push(suggestion);
                return {
                    found: true,
                    parsed: changedParsed,
                    toBeParsed: changedToBeParsed,
                    suggestions,
                };
            }
            if (changedToBeParsed === '') {
                return {
                    found: true,
                    parsed: changedParsed,
                    toBeParsed: changedToBeParsed,
                    suggestions,
                };
            }
            if (changedToBeParsed === ' ') {
                localToBeParsed = '';
            } else {
                localToBeParsed = changedToBeParsed;
            }
            localParsed = changedParsed;
        }

        if (arg.Type === AUTOCOMPLETE_ARG.TEXT) {
            const {
                found,
                parsed: changedParsed,
                toBeParsed: changedToBeParsed,
                suggestion,
            } = this.parseInputTextArgument(arg, localParsed, localToBeParsed);
            if (found) {
                suggestions.push(suggestion);
                return {
                    found: true,
                    parsed: changedParsed,
                    toBeParsed: changedToBeParsed,
                    suggestions,
                };
            }
            localParsed = changedParsed;
            localToBeParsed = changedToBeParsed;
        } else if (arg.Type === AUTOCOMPLETE_ARG.STATIC_LIST) {
            const {
                found,
                parsed: changedParsed,
                toBeParsed: changedToBeParsed,
                suggestions: staticListSuggestions,
            } = this.parseStaticListArgument(arg, localParsed, localToBeParsed);
            if (found) {
                suggestions = suggestions.concat(staticListSuggestions);
                return {
                    found: true,
                    parsed: changedParsed,
                    toBeParsed: changedToBeParsed,
                    suggestions,
                };
            }
            localParsed = changedParsed;
            localToBeParsed = changedToBeParsed;
        } else if (arg.Type === AUTOCOMPLETE_ARG.DYNAMIC_LIST) {
            const {
                found,
                parsed: changedParsed,
                toBeParsed: changedToBeParsed,
                suggestions: dynamicListSuggestions,
            } = this.getDynamicListArgument(arg, dynamicArguments, localParsed, localToBeParsed);
            if (found) {
                suggestions = suggestions.concat(dynamicListSuggestions);
                return {
                    found: true,
                    parsed: changedParsed,
                    toBeParsed: changedToBeParsed,
                    suggestions,
                };
            }
            localParsed = changedParsed;
            localToBeParsed = changedToBeParsed;
        }

        return {
            found: false,
            parsed: localParsed,
            toBeParsed: localToBeParsed,
            suggestions,
        };
    }

    parseNamedArgument = (arg, parsed, toBeParsed) => {
        if (!arg) {
            return {
                found: false,
                parsed,
                toBeParsed,
                suggestion: {},
            };
        }
        let inp = toBeParsed;
        if (toBeParsed.startsWith(' ')) {
            inp = toBeParsed.substring(1);
        }
        const namedArg = '--' + arg.Name;
        if (inp === '') { //The user has not started typing the argument.
            return {
                found: true,
                parsed: parsed + toBeParsed,
                toBeParsed: '',
                suggestion: {Complete: parsed + toBeParsed + namedArg + ' ', Suggestion: namedArg, Hint: '', Description: arg.HelpText},
            };
        }
        if (namedArg.toLowerCase().startsWith(inp.toLowerCase())) {
            return {
                found: true,
                parsed: parsed + toBeParsed,
                toBeParsed: '',
                suggestion: {Complete: parsed + toBeParsed + namedArg.substring(inp.length) + ' ', Suggestion: namedArg, Hint: '', Description: arg.HelpText},
            };
        }

        if (!inp.toLowerCase().startsWith(namedArg.toLowerCase() + ' ')) {
            return {
                found: false,
                parsed: parsed + toBeParsed,
                toBeParsed: '',
                suggestion: {},
            };
        }
        if (inp.toLowerCase() === namedArg.toLowerCase() + ' ') {
            return {
                found: false,
                parsed: parsed + namedArg + ' ',
                toBeParsed: ' ',
                suggestion: {},
            };
        }

        return {
            found: false,
            parsed: parsed + namedArg + ' ',
            toBeParsed: inp.substring(namedArg.length + 1),
            suggestion: {},
        };
    }

    parseInputTextArgument = (arg, parsed, toBeParsed) => {
        if (!arg || !arg.Data) {
            return {
                found: false,
                parsed,
                toBeParsed,
                suggestion: {},
            };
        }
        let inp = toBeParsed;
        if (toBeParsed.startsWith(' ')) {
            inp = toBeParsed.slice(1);
        }
        const a = arg.Data;
        if (inp === '') { //The user has not started typing the argument.
            return {
                found: true,
                parsed: parsed + toBeParsed,
                toBeParsed: '',
                suggestion: {Complete: parsed + toBeParsed, Suggestion: '', Hint: a.Hint, Description: arg.HelpText},
            };
        }
        if (inp[0] === '"') { //input with multiple words
            const indexOfSecondQuote = inp.slice(1).indexOf('"');
            if (indexOfSecondQuote === -1) { //typing of the multiple word argument is not finished
                return {
                    found: true,
                    parsed: parsed + toBeParsed,
                    toBeParsed: '',
                    suggestion: {Complete: parsed + toBeParsed, Suggestion: '', Hint: a.Hint, Description: arg.HelpText},
                };
            }

            // this argument is typed already
            let offset = 2;
            if (inp.length > indexOfSecondQuote + 2 && inp[indexOfSecondQuote + 2] === ' ') {
                offset++;
            }
            return {
                found: false,
                parsed: parsed + inp.substring(0, indexOfSecondQuote + offset),
                toBeParsed: inp.substring(indexOfSecondQuote + offset),
                suggestion: {},
            };
        }

        // input with a single word
        const index = inp.indexOf(' ');
        if (index === -1) { // typing of the single word argument is not finished
            return {
                found: true,
                parsed: parsed + toBeParsed,
                toBeParsed: '',
                suggestion: {Complete: parsed + toBeParsed, Suggestion: '', Hint: a.Hint, Description: arg.HelpText},
            };
        }

        // single word argument already typed
        return {
            found: false,
            parsed: parsed + inp.substring(0, index + 1),
            toBeParsed: inp.substring(index + 1),
            suggestion: {},
        };
    }

    parseStaticListArgument = (arg, parsed, toBeParsed) => {
        if (!arg || !arg.Data || !arg.Data.PossibleArguments) {
            return {
                found: false,
                parsed,
                toBeParsed,
                suggestion: [],
            };
        }
        return this.parseListItems(arg.Data.PossibleArguments, parsed, toBeParsed);
    }

    getDynamicListArgument = (arg, dynamicArguments, parsed, toBeParsed) => {
        if (!arg || !arg.Data) {
            return {
                found: false,
                parsed,
                toBeParsed,
                suggestion: [],
            };
        }
        const dynamicArg = arg.Data;
        const autocompleteItems = dynamicArguments[dynamicArg.FetchURL];
        this.updateDynamicAutocompleteSuggestions(dynamicArg.FetchURL, parsed, toBeParsed);

        return this.parseListItems(autocompleteItems, parsed, toBeParsed);
    }

    parseListItems = (items, parsed, toBeParsed) => {
        if (!items) {
            return {
                found: false,
                parsed,
                toBeParsed,
                suggestions: [],
            };
        }
        let inp = toBeParsed;
        if (toBeParsed.startsWith(' ')) {
            inp = toBeParsed.slice(1);
        }
        const suggestions = [];
        let maxPrefix = '';
        for (let i = 0; i < items.length; i++) {
            if (inp.toLowerCase().startsWith(items[i].Item.toLowerCase() + ' ') && maxPrefix.length < items[i].Item.length + 1) {
                maxPrefix = items[i].Item + ' ';
            }
        }

        if (maxPrefix !== '') { //typing of an argument finished
            return {
                found: false,
                parsed: parsed + inp.substring(0, maxPrefix.length),
                toBeParsed: inp.substring(maxPrefix.length),
                suggestions: [],
            };
        }

        // user has not finished typing static argument
        for (let i = 0; i < items.length; i++) {
            if (items[i].Item.toLowerCase().startsWith(inp.toLowerCase())) {
                suggestions.push({Complete: parsed + items[i].Item, Suggestion: items[i].Item, Hint: items[i].Hint, Description: items[i].HelpText});
            }
        }

        return {
            found: true,
            parsed: parsed + toBeParsed,
            toBeParsed: '',
            suggestions,
        };
    }
}