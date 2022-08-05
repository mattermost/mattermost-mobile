// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Platform} from 'react-native';

import AtMentionItem from '@components/autocomplete/at_mention_item';
import ChannelMentionItem from '@components/autocomplete/channel_mention_item';
import {COMMAND_SUGGESTION_CHANNEL, COMMAND_SUGGESTION_USER} from '@constants/apps';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import analytics from '@managers/analytics';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {AppCommandParser, ExtendedAutocompleteSuggestion} from '../app_command_parser/app_command_parser';
import SlashSuggestionItem from '../slash_suggestion_item';

import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

export type Props = {
    currentTeamId: string;
    isSearch?: boolean;
    maxListHeight?: number;
    updateValue: (text: string) => void;
    onShowingChange: (c: boolean) => void;
    value: string;
    nestedScrollEnabled?: boolean;
    rootId?: string;
    channelId: string;
    isAppsEnabled: boolean;
};

const keyExtractor = (item: ExtendedAutocompleteSuggestion): string => item.Suggestion + item.type + item.item;

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

const emptySuggestonList: AutocompleteSuggestion[] = [];

const AppSlashSuggestion = ({
    channelId,
    currentTeamId,
    rootId,
    value = '',
    isAppsEnabled,
    maxListHeight,
    nestedScrollEnabled,
    updateValue,
    onShowingChange,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const appCommandParser = useRef<AppCommandParser>(new AppCommandParser(serverUrl, intl, channelId, currentTeamId, rootId, theme));
    const [dataSource, setDataSource] = useState<AutocompleteSuggestion[]>(emptySuggestonList);
    const active = isAppsEnabled && Boolean(dataSource.length);
    const style = getStyleFromTheme(theme);
    const mounted = useRef(false);

    const listStyle = useMemo(() => [style.listView, {maxHeight: maxListHeight}], [maxListHeight, style]);

    const fetchAndShowAppCommandSuggestions = useMemo(() => debounce(async (pretext: string, cId: string, tId = '', rId?: string) => {
        appCommandParser.current.setChannelContext(cId, tId, rId);
        const suggestions = await appCommandParser.current.getSuggestions(pretext);
        if (!mounted.current) {
            return;
        }
        updateSuggestions(suggestions);
    }), []);

    const updateSuggestions = (matches: ExtendedAutocompleteSuggestion[]) => {
        setDataSource(matches);
        onShowingChange(Boolean(matches.length));
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
    }, [serverUrl, updateValue]);

    const completeIgnoringSuggestion = useCallback((base: string): (toIgnore: string) => void => {
        return () => {
            completeSuggestion(base);
        };
    }, [completeSuggestion]);

    const renderItem = useCallback(({item}: {item: ExtendedAutocompleteSuggestion}) => {
        switch (item.type) {
            case COMMAND_SUGGESTION_USER:
                if (!item.item) {
                    return null;
                }
                return (
                    <AtMentionItem
                        user={item.item as UserProfile | UserModel}
                        onPress={completeIgnoringSuggestion(item.Complete)}
                        testID='autocomplete.slash_suggestion.at_mention_item'
                    />
                );
            case COMMAND_SUGGESTION_CHANNEL:
                if (!item.item) {
                    return null;
                }
                return (
                    <ChannelMentionItem
                        channel={item.item as Channel | ChannelModel}
                        onPress={completeIgnoringSuggestion(item.Complete)}
                        testID='autocomplete.slash_suggestion.channel_mention_item'
                    />
                );
            default:
                return (
                    <SlashSuggestionItem
                        description={item.Description}
                        hint={item.Hint}
                        onPress={completeSuggestion}
                        suggestion={item.Suggestion}
                        complete={item.Complete}
                        icon={item.IconData}
                    />
                );
        }
    }, [completeSuggestion, completeIgnoringSuggestion]);

    const isAppCommand = (pretext: string, channelID: string, teamID = '', rootID?: string) => {
        appCommandParser.current.setChannelContext(channelID, teamID, rootID);
        return appCommandParser.current.isAppCommand(pretext);
    };

    useEffect(() => {
        if (value[0] !== '/') {
            fetchAndShowAppCommandSuggestions.cancel();
            updateSuggestions(emptySuggestonList);
            return;
        }

        if (value.indexOf(' ') === -1) {
            // Let slash command suggestions handle base commands.
            fetchAndShowAppCommandSuggestions.cancel();
            updateSuggestions(emptySuggestonList);
            return;
        }

        if (!isAppCommand(value, channelId, currentTeamId, rootId)) {
            fetchAndShowAppCommandSuggestions.cancel();
            updateSuggestions(emptySuggestonList);
            return;
        }
        fetchAndShowAppCommandSuggestions(value, channelId, currentTeamId, rootId);
    }, [value]);

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
            testID='app_slash_suggestion.list'
            keyboardShouldPersistTaps='always'
            style={listStyle}
            data={dataSource}
            keyExtractor={keyExtractor}
            removeClippedSubviews={true}
            renderItem={renderItem}
            nestedScrollEnabled={nestedScrollEnabled}
        />
    );
};
export default AppSlashSuggestion;
