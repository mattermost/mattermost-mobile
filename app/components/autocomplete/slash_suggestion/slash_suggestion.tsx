// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    FlatList,
    Platform,
} from 'react-native';

import {fetchCommands, fetchSuggestions} from '@actions/remote/command';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import analytics from '@init/analytics';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {AppCommandParser} from './app_command_parser/app_command_parser';
import SlashSuggestionItem from './slash_suggestion_item';

// TODO: Remove when all below commands have been implemented
const COMMANDS_TO_IMPLEMENT_LATER = ['collapse', 'expand', 'join', 'open', 'leave', 'logout', 'msg', 'grpmsg'];
const NON_MOBILE_COMMANDS = ['rename', 'invite_people', 'shortcuts', 'search', 'help', 'settings', 'remove'];

const COMMANDS_TO_HIDE_ON_MOBILE = [...COMMANDS_TO_IMPLEMENT_LATER, ...NON_MOBILE_COMMANDS];

const commandFilter = (v: Command) => !COMMANDS_TO_HIDE_ON_MOBILE.includes(v.trigger);

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            paddingTop: 8,
            borderRadius: 4,
        },
    };
});

const filterCommands = (matchTerm: string, commands: Command[]): AutocompleteSuggestion[] => {
    const data = commands.filter((command) => {
        if (!command.auto_complete) {
            return false;
        } else if (!matchTerm) {
            return true;
        }

        return command.display_name.startsWith(matchTerm) || command.trigger.startsWith(matchTerm);
    });
    return data.map((item) => {
        return {
            complete: item.trigger,
            suggestion: '/' + item.trigger,
            hint: item.auto_complete_hint,
            description: item.auto_complete_desc,
            iconData: item.icon_url || item.autocomplete_icon_data || '',
        };
    });
};

const keyExtractor = (item: Command & AutocompleteSuggestion): string => item.id || item.suggestion || '';

type Props = {
    currentTeamId: string;
    commands: Command[];
    maxListHeight?: number;
    onChangeText: (text: string) => void;
    onResultCountChange: (count: number) => void;
    value: string;
    nestedScrollEnabled?: boolean;
    rootId?: string;
    channelId: string;
    appsEnabled: boolean;
};

const emptyCommandList: Command[] = [];
const emptySuggestionList: AutocompleteSuggestion[] = [];

const SlashSuggestion = ({
    channelId,
    currentTeamId,
    rootId,
    onResultCountChange,
    appsEnabled,
    maxListHeight,
    nestedScrollEnabled,
    onChangeText,
    value = '',
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const serverUrl = useServerUrl();
    const appCommandParser = useRef<AppCommandParser>(new AppCommandParser(serverUrl, intl, channelId, currentTeamId, rootId, theme));

    const [dataSource, setDataSource] = useState<AutocompleteSuggestion[]>(emptySuggestionList);
    const [commands, setCommands] = useState<Command[]>();

    const active = Boolean(dataSource.length);

    const updateSuggestions = useCallback((matches: AutocompleteSuggestion[]) => {
        setDataSource(matches);
        onResultCountChange(matches.length);
    }, [onResultCountChange]);

    const runFetch = useMemo(() => debounce(async (sUrl: string, term: string, tId: string, cId: string, rId?: string) => {
        try {
            const res = await fetchSuggestions(sUrl, term, tId, cId, rId);
            if (res.error) {
                updateSuggestions(emptySuggestionList);
            } else if (res.suggestions.length === 0) {
                updateSuggestions(emptySuggestionList);
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

        if (appsEnabled) {
            const appCommands = getAppBaseCommandSuggestions(text);
            matches = matches.concat(appCommands);
        }

        matches = matches.concat(filterCommands(text.substring(1), commands!));

        matches.sort((match1, match2) => {
            if (match1.suggestion === match2.suggestion) {
                return 0;
            }
            return match1.suggestion > match2.suggestion ? 1 : -1;
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

        onChangeText(completedDraft);

        if (Platform.OS === 'ios') {
            // This is the second part of the hack were we replace the double / with just one
            // after the auto correct vanished
            setTimeout(() => {
                onChangeText(completedDraft.replace(`//${command} `, `/${command} `));
            });
        }
    }, [onChangeText, serverUrl]);

    const renderItem = useCallback(({item}: {item: AutocompleteSuggestion}) => (
        <SlashSuggestionItem
            description={item.description}
            hint={item.hint}
            onPress={completeSuggestion}
            suggestion={item.suggestion}
            complete={item.complete}
            icon={item.iconData}
        />
    ), [completeSuggestion]);

    useEffect(() => {
        if (value[0] !== '/') {
            updateSuggestions(emptySuggestionList);
            return;
        }

        if (!commands) {
            fetchCommands(serverUrl, currentTeamId).then((res) => {
                if (res.error) {
                    setCommands(emptyCommandList);
                } else {
                    setCommands(res.commands.filter(commandFilter));
                }
            });
            return;
        }

        if (value.indexOf(' ') === -1) {
            showBaseCommands(value);
            return;
        }

        runFetch(serverUrl, value, currentTeamId, channelId, rootId);
    }, [value, commands]);

    if (!active) {
        // If we are not in an active state return null so nothing is rendered
        // other components are not blocked.
        return null;
    }

    return (
        <FlatList
            testID='slash_suggestion.list'
            keyboardShouldPersistTaps='always'
            style={[style.listView, {maxHeight: maxListHeight}]}
            data={dataSource}
            keyExtractor={keyExtractor}
            removeClippedSubviews={true}
            renderItem={renderItem}
            nestedScrollEnabled={nestedScrollEnabled}
        />
    );
};

export default SlashSuggestion;
