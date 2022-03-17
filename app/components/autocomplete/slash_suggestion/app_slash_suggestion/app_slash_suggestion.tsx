// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    FlatList,
    Platform,
} from 'react-native';

import AtMentionItem from '@components/autocomplete/at_mention_item';
import ChannelMentionItem from '@components/autocomplete/channel_mention_item';
import {COMMAND_SUGGESTION_CHANNEL, COMMAND_SUGGESTION_USER} from '@constants/apps';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import analytics from '@init/analytics';
import ChannelModel from '@typings/database/models/servers/channel';
import UserModel from '@typings/database/models/servers/user';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {AppCommandParser, ExtendedAutocompleteSuggestion} from '../app_command_parser/app_command_parser';
import SlashSuggestionItem from '../slash_suggestion_item';

export type Props = {
    currentTeamId: string;
    isSearch?: boolean;
    maxListHeight?: number;
    onChangeText: (text: string) => void;
    onResultCountChange: (count: number) => void;
    value: string;
    nestedScrollEnabled?: boolean;
    rootId?: string;
    channelId: string;
    appsEnabled: boolean;
};

const keyExtractor = (item: ExtendedAutocompleteSuggestion): string => (item.suggestion || '') + item.type + item.item;

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

const AppSlashSuggestion = ({
    channelId,
    currentTeamId,
    rootId,
    value = '',
    appsEnabled,
    maxListHeight,
    nestedScrollEnabled,
    onChangeText,
    onResultCountChange,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const appCommandParser = useRef<AppCommandParser>(new AppCommandParser(serverUrl, intl, channelId, currentTeamId, rootId, theme));
    const [dataSource, setDataSource] = useState<AutocompleteSuggestion[]>([]);
    const active = appsEnabled && Boolean(dataSource.length);
    const style = getStyleFromTheme(theme);

    const updateSuggestions = (matches: ExtendedAutocompleteSuggestion[]) => {
        setDataSource(matches);
        onResultCountChange(matches.length);
    };

    const completeSuggestion = (command: string) => {
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
    };

    const completeUserSuggestion = (base: string): (username: string) => void => {
        return () => {
            completeSuggestion(base);
        };
    };

    const completeChannelMention = (base: string): (channelName: string) => void => {
        return () => {
            completeSuggestion(base);
        };
    };

    const renderItem = ({item}: {item: ExtendedAutocompleteSuggestion}) => {
        switch (item.type) {
            case COMMAND_SUGGESTION_USER:
                if (!item.item) {
                    return null;
                }
                return (
                    <AtMentionItem
                        user={item.item as UserProfile | UserModel}
                        onPress={completeUserSuggestion(item.complete)}
                        testID={`autocomplete.at_mention.item.${item.item}`}
                    />
                );
            case COMMAND_SUGGESTION_CHANNEL:
                if (!item.item) {
                    return null;
                }
                return (
                    <ChannelMentionItem
                        channel={item.item as Channel | ChannelModel}
                        onPress={completeChannelMention(item.complete)}
                        testID={`autocomplete.channel_mention.item.${item.item}`}
                    />
                );
            default:
                return (
                    <SlashSuggestionItem
                        description={item.description}
                        hint={item.hint}
                        onPress={completeSuggestion}
                        suggestion={item.suggestion}
                        complete={item.complete}
                        icon={item.iconData}
                    />
                );
        }
    };

    const isAppCommand = (pretext: string, channelID: string, teamID = '', rootID?: string) => {
        appCommandParser.current.setChannelContext(channelID, teamID, rootID);
        return appCommandParser.current.isAppCommand(pretext);
    };

    const fetchAndShowAppCommandSuggestions = async (pretext: string, channelID: string, teamID = '', rootID?: string) => {
        appCommandParser.current.setChannelContext(channelID, teamID, rootID);
        const suggestions = await appCommandParser.current.getSuggestions(pretext);
        updateSuggestions(suggestions);
    };

    useEffect(() => {
        if (value[0] !== '/') {
            setDataSource([]);
            onResultCountChange(0);
            return;
        }

        if (value.indexOf(' ') === -1) {
            setDataSource([]);
            return;
        }

        if (!isAppCommand(value, channelId, currentTeamId, rootId)) {
            setDataSource([]);
            return;
        }
        fetchAndShowAppCommandSuggestions(value, channelId, currentTeamId, rootId);
    }, [value]);

    if (!active) {
        // If we are not in an active state return null so nothing is rendered
        // other components are not blocked.
        return null;
    }

    return (
        <FlatList
            testID='app_slash_suggestion.list'
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
export default AppSlashSuggestion;
