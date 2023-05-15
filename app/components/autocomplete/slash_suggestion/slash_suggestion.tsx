// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    FlatList,
    Platform,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import {fetchSuggestions} from '@actions/remote/command';
import {useServerUrl} from '@context/server';
import analytics from '@managers/analytics';
import IntegrationsManager from '@managers/integrations_manager';

import {AppCommandParser} from './app_command_parser/app_command_parser';
import SlashSuggestionItem from './slash_suggestion_item';

// TODO: Remove when all below commands have been implemented https://mattermost.atlassian.net/browse/MM-43478
const COMMANDS_TO_IMPLEMENT_LATER = ['collapse', 'expand', 'logout'];
const NON_MOBILE_COMMANDS = ['shortcuts', 'search', 'settings'];

const COMMANDS_TO_HIDE_ON_MOBILE = new Set([...COMMANDS_TO_IMPLEMENT_LATER, ...NON_MOBILE_COMMANDS]);

const commandFilter = (v: Command) => !COMMANDS_TO_HIDE_ON_MOBILE.has(v.trigger);

const filterCommands = (matchTerm: string, commands: Command[]): AutocompleteSuggestion[] => {
    const data = commands.filter((command) => {
        if (!command.auto_complete) {
            return false;
        } else if (!matchTerm) {
            return true;
        }

        return command.display_name.startsWith(matchTerm) || command.trigger.startsWith(matchTerm);
    });
    return data.map((command) => {
        return {
            Complete: command.trigger,
            Suggestion: '/' + command.trigger,
            Hint: command.auto_complete_hint,
            Description: command.auto_complete_desc,
            IconData: command.icon_url || command.autocomplete_icon_data || '',
        };
    });
};

const keyExtractor = (item: Command & AutocompleteSuggestion): string => item.id || item.Suggestion;

type Props = {
    currentTeamId: string;
    updateValue: (text: string) => void;
    onShowingChange: (c: boolean) => void;
    value: string;
    nestedScrollEnabled?: boolean;
    rootId?: string;
    channelId: string;
    isAppsEnabled: boolean;
    listStyle: StyleProp<ViewStyle>;
};

const emptyCommandList: Command[] = [];
const emptySuggestionList: AutocompleteSuggestion[] = [];

const SlashSuggestion = ({
    channelId,
    currentTeamId,
    rootId,
    onShowingChange,
    isAppsEnabled,
    nestedScrollEnabled,
    updateValue,
    value = '',
    listStyle,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const appCommandParser = useRef<AppCommandParser>(new AppCommandParser(serverUrl, intl, channelId, currentTeamId, rootId));
    const mounted = useRef(false);
    const [noResultsTerm, setNoResultsTerm] = useState<string|null>(null);

    const [dataSource, setDataSource] = useState<AutocompleteSuggestion[]>(emptySuggestionList);
    const [commands, setCommands] = useState<Command[]>();

    const active = Boolean(dataSource.length);

    const updateSuggestions = useCallback((matches: AutocompleteSuggestion[]) => {
        setDataSource(matches);
        onShowingChange(Boolean(matches.length));
    }, [onShowingChange]);

    const runFetch = useMemo(() => debounce(async (sUrl: string, term: string, tId: string, cId: string, rId?: string) => {
        try {
            const res = await fetchSuggestions(sUrl, term, tId, cId, rId);
            if (!mounted.current) {
                return;
            }
            if ('error' in res) {
                updateSuggestions(emptySuggestionList);
            } else if (res.suggestions.length === 0) {
                updateSuggestions(emptySuggestionList);
                setNoResultsTerm(term);
            } else {
                updateSuggestions(res.suggestions);
            }
        } catch {
            updateSuggestions(emptySuggestionList);
        }
    }, 200), [updateSuggestions]);

    const getAppBaseCommandSuggestions = (pretext: string): AutocompleteSuggestion[] => {
        appCommandParser.current.setChannelContext(channelId, currentTeamId, rootId);
        const suggestions = appCommandParser.current.getSuggestionsBase(pretext);
        return suggestions;
    };

    const showBaseCommands = (text: string) => {
        let matches: AutocompleteSuggestion[] = [];

        if (isAppsEnabled) {
            const appCommands = getAppBaseCommandSuggestions(text);
            matches = matches.concat(appCommands);
        }

        matches = matches.concat(filterCommands(text.substring(1), commands!));

        matches.sort((match1, match2) => {
            if (match1.Suggestion === match2.Suggestion) {
                return 0;
            }
            return match1.Suggestion > match2.Suggestion ? 1 : -1;
        });

        updateSuggestions(matches);
    };

    const completeSuggestion = useCallback((command: string) => {
        analytics.get(serverUrl)?.trackCommand('complete_suggestion', `/${command} `);

        // We are going to set a double / on iOS to prevent the auto correct from taking over and replacing it
        // with the wrong value, this is a hack but I could not found another way to solve it
        let completedDraft = `/${command} `;
        if (Platform.OS === 'ios') {
            completedDraft = `//${command} `;
        }

        updateValue(completedDraft);

        if (Platform.OS === 'ios') {
            // This is the second part of the hack were we replace the double / with just one
            // after the auto correct vanished
            setTimeout(() => {
                updateValue(completedDraft.replace(`//${command} `, `/${command} `));
            });
        }
    }, [updateValue, serverUrl]);

    const renderItem = useCallback(({item}: {item: AutocompleteSuggestion}) => (
        <SlashSuggestionItem
            description={item.Description}
            hint={item.Hint}
            onPress={completeSuggestion}
            suggestion={item.Suggestion}
            complete={item.Complete}
            icon={item.IconData}
        />
    ), [completeSuggestion]);

    useEffect(() => {
        if (value[0] !== '/') {
            runFetch.cancel();
            setNoResultsTerm(null);
            updateSuggestions(emptySuggestionList);
            return;
        }

        if (!commands) {
            IntegrationsManager.getManager(serverUrl).fetchCommands(currentTeamId).then((res) => {
                if (res.length) {
                    setCommands(res.filter(commandFilter));
                } else {
                    setCommands(emptyCommandList);
                }
            });
            return;
        }

        if (value.indexOf(' ') === -1) {
            runFetch.cancel();
            showBaseCommands(value);
            setNoResultsTerm(null);
            return;
        }

        if (noResultsTerm && value.startsWith(noResultsTerm)) {
            return;
        }

        runFetch(serverUrl, value, currentTeamId, channelId, rootId);
    }, [value, commands]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    if (!active) {
        // If we are not in an active state return null so nothing is rendered
        // other components are not blocked.
        return null;
    }

    return (
        <FlatList
            keyboardShouldPersistTaps='always'
            style={listStyle}
            data={dataSource}
            keyExtractor={keyExtractor}
            removeClippedSubviews={true}
            renderItem={renderItem}
            nestedScrollEnabled={nestedScrollEnabled}
            testID='autocomplete.slash_suggestion.flat_list'
        />
    );
};

export default SlashSuggestion;
