// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, SectionList, SectionListData} from 'react-native';

import {searchChannels} from '@actions/remote/channel';
import AutocompleteSectionHeader from '@components/autocomplete/autocomplete_section_header';
import ChannelMentionItem from '@components/autocomplete/channel_mention_item';
import {General} from '@constants';
import {CHANNEL_MENTION_REGEX, CHANNEL_MENTION_SEARCH_REGEX} from '@constants/autocomplete';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import useDidUpdate from '@hooks/did_update';
import {t} from '@i18n';
import {queryAllChannelsForTeam} from '@queries/servers/channel';
import {getCurrentTeamId} from '@queries/servers/system';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const keyExtractor = (item: Channel) => {
    return item.id;
};

const getMatchTermForChannelMention = (() => {
    let lastMatchTerm: string | null = null;
    let lastValue: string;
    let lastIsSearch: boolean;
    return (value: string, isSearch: boolean) => {
        if (value !== lastValue || isSearch !== lastIsSearch) {
            const regex = isSearch ? CHANNEL_MENTION_SEARCH_REGEX : CHANNEL_MENTION_REGEX;
            const match = value.match(regex);
            lastValue = value;
            lastIsSearch = isSearch;
            if (match) {
                if (isSearch) {
                    lastMatchTerm = match[1].toLowerCase();
                } else if (match.index && match.index > 0 && value[match.index - 1] === '~') {
                    lastMatchTerm = null;
                } else {
                    lastMatchTerm = match[2].toLowerCase();
                }
            } else {
                lastMatchTerm = null;
            }
        }
        return lastMatchTerm;
    };
})();

const reduceChannelsForSearch = (channels: Array<Channel | ChannelModel>, members: MyChannelModel[]) => {
    const memberIds = new Set(members.map((m) => m.id));
    return channels.reduce<Array<Array<Channel | ChannelModel>>>(([pubC, priC, dms], c) => {
        switch (c.type) {
            case General.OPEN_CHANNEL:
                if (memberIds.has(c.id)) {
                    pubC.push(c);
                }
                break;
            case General.PRIVATE_CHANNEL:
                priC.push(c);
                break;
            case General.DM_CHANNEL:
            case General.GM_CHANNEL:
                dms.push(c);
        }
        return [pubC, priC, dms];
    }, [[], [], []]);
};

const reduceChannelsForAutocomplete = (channels: Array<Channel | ChannelModel>, members: MyChannelModel[]) => {
    const memberIds = new Set(members.map((m) => m.id));
    return channels.reduce<Array<Array<Channel | ChannelModel>>>(([myC, otherC], c) => {
        if (memberIds.has(c.id)) {
            myC.push(c);
        } else {
            otherC.push(c);
        }
        return [myC, otherC];
    }, [[], []]);
};

const makeSections = (channels: Array<Channel | ChannelModel>, myMembers: MyChannelModel[], isSearch = false) => {
    const newSections = [];
    if (isSearch) {
        const [publicChannels, privateChannels, directAndGroupMessages] = reduceChannelsForSearch(channels, myMembers);
        if (publicChannels.length) {
            newSections.push({
                id: t('suggestion.search.public'),
                defaultMessage: 'Public Channels',
                data: publicChannels,
                key: 'publicChannels',
                hideLoadingIndicator: true,
            });
        }

        if (privateChannels.length) {
            newSections.push({
                id: t('suggestion.search.private'),
                defaultMessage: 'Private Channels',
                data: privateChannels,
                key: 'privateChannels',
                hideLoadingIndicator: true,
            });
        }

        if (directAndGroupMessages.length) {
            newSections.push({
                id: t('suggestion.search.direct'),
                defaultMessage: 'Direct Messages',
                data: directAndGroupMessages,
                key: 'directAndGroupMessages',
                hideLoadingIndicator: true,
            });
        }
    } else {
        const [myChannels, otherChannels] = reduceChannelsForAutocomplete(channels, myMembers);
        if (myChannels.length) {
            newSections.push({
                id: t('suggestion.mention.channels'),
                defaultMessage: 'My Channels',
                data: myChannels,
                key: 'myChannels',
                hideLoadingIndicator: true,
            });
        }

        if (otherChannels.length) {
            newSections.push({
                id: t('suggestion.mention.morechannels'),
                defaultMessage: 'Other Channels',
                data: otherChannels,
                key: 'otherChannels',
                hideLoadingIndicator: true,
            });
        }
    }

    const nSections = newSections.length;
    if (nSections) {
        newSections[nSections - 1].hideLoadingIndicator = false;
    }

    return newSections;
};

const filterLocalResults = (channels: ChannelModel[], term: string) => {
    return channels.filter((c) =>
        c.name.toLowerCase().startsWith(term) ||
        c.displayName.toLowerCase().startsWith(term),
    );
};

type Props = {
    cursorPosition: number;
    isSearch: boolean;
    maxListHeight: number;
    myMembers: MyChannelModel[];
    updateValue: (v: string) => void;
    onShowingChange: (c: boolean) => void;
    value: string;
    nestedScrollEnabled: boolean;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
        },
    };
});

const getAllChannels = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return [];
    }

    const teamId = await getCurrentTeamId(database);
    return queryAllChannelsForTeam(database, teamId).fetch();
};

const emptySections: Array<SectionListData<Channel>> = [];
const emptyChannels: Channel[] = [];
const emptyModelList: ChannelModel[] = [];

const ChannelMention = ({
    cursorPosition,
    isSearch,
    maxListHeight,
    myMembers,
    updateValue,
    onShowingChange,
    value,
    nestedScrollEnabled,
}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const [sections, setSections] = useState<Array<SectionListData<(Channel | ChannelModel)>>>(emptySections);
    const [channels, setChannels] = useState<Channel[]>(emptyChannels);
    const [loading, setLoading] = useState(false);
    const [noResultsTerm, setNoResultsTerm] = useState<string|null>(null);
    const [localCursorPosition, setLocalCursorPosition] = useState(cursorPosition); // To avoid errors due to delay between value changes and cursor position changes.
    const [useLocal, setUseLocal] = useState(true);
    const [localChannels, setlocalChannels] = useState<ChannelModel[]>();
    const [filteredLocalChannels, setFilteredLocalChannels] = useState(emptyModelList);

    const listStyle = useMemo(() =>
        [style.listView, {maxHeight: maxListHeight}]
    , [style, maxListHeight]);

    const runSearch = useMemo(() => debounce(async (sUrl: string, term: string) => {
        setLoading(true);
        const {channels: receivedChannels, error} = await searchChannels(sUrl, term);
        setUseLocal(Boolean(error));

        if (error) {
            let fallbackChannels = localChannels;
            if (!fallbackChannels) {
                fallbackChannels = await getAllChannels(sUrl);
                setlocalChannels(fallbackChannels);
            }
            const filteredChannels = filterLocalResults(fallbackChannels, term);
            setFilteredLocalChannels(filteredChannels.length ? filteredChannels : emptyModelList);
        } else if (receivedChannels) {
            setChannels(receivedChannels.length ? receivedChannels : emptyChannels);
        }
        setLoading(false);
    }, 200), []);

    const matchTerm = getMatchTermForChannelMention(value.substring(0, localCursorPosition), isSearch);
    const resetState = () => {
        setFilteredLocalChannels(emptyModelList);
        setChannels(emptyChannels);
        setSections(emptySections);
        runSearch.cancel();
    };

    const completeMention = useCallback((mention: string) => {
        const mentionPart = value.substring(0, localCursorPosition);

        let completedDraft: string;
        if (isSearch) {
            const channelOrIn = mentionPart.includes('in:') ? 'in:' : 'channel:';
            completedDraft = mentionPart.replace(CHANNEL_MENTION_SEARCH_REGEX, `${channelOrIn} ${mention} `);
        } else if (Platform.OS === 'ios') {
            // We are going to set a double ~ on iOS to prevent the auto correct from taking over and replacing it
            // with the wrong value, this is a hack but I could not found another way to solve it
            completedDraft = mentionPart.replace(CHANNEL_MENTION_REGEX, `~~${mention} `);
        } else {
            completedDraft = mentionPart.replace(CHANNEL_MENTION_REGEX, `~${mention} `);
        }

        const newCursorPosition = completedDraft.length - 1;

        if (value.length > localCursorPosition) {
            completedDraft += value.substring(localCursorPosition);
        }

        updateValue(completedDraft);
        setLocalCursorPosition(newCursorPosition);

        if (Platform.OS === 'ios') {
            // This is the second part of the hack were we replace the double ~ with just one
            // after the auto correct vanished
            setTimeout(() => {
                updateValue(completedDraft.replace(`~~${mention} `, `~${mention} `));
            });
        }

        onShowingChange(false);
        setNoResultsTerm(mention);
        setSections(emptySections);
    }, [value, localCursorPosition, isSearch]);

    const renderItem = useCallback(({item}) => {
        return (
            <ChannelMentionItem
                channel={item}
                onPress={completeMention}
                testID={`autocomplete.channel_mention.item.${item}`}
            />
        );
    }, [completeMention]);

    const renderSectionHeader = useCallback(({section}) => {
        return (
            <AutocompleteSectionHeader
                id={section.id}
                defaultMessage={section.defaultMessage}
                loading={!section.hideLoadingIndicator && loading}
            />
        );
    }, [loading]);

    useEffect(() => {
        if (localCursorPosition !== cursorPosition) {
            setLocalCursorPosition(cursorPosition);
        }
    }, [cursorPosition]);

    useEffect(() => {
        if (matchTerm === null) {
            resetState();
            onShowingChange(false);
            return;
        }

        if (noResultsTerm != null && matchTerm.startsWith(noResultsTerm)) {
            return;
        }

        setNoResultsTerm(null);
        runSearch(serverUrl, matchTerm);
    }, [matchTerm]);

    useDidUpdate(() => {
        const newSections = makeSections(useLocal ? filteredLocalChannels : channels, myMembers, isSearch);
        const nSections = newSections.length;

        if (!loading && !nSections && noResultsTerm == null) {
            setNoResultsTerm(matchTerm);
        }
        setSections(newSections.length ? newSections : emptySections);
        onShowingChange(Boolean(nSections));
    }, [channels, myMembers, loading]);

    if (sections.length === 0 || noResultsTerm != null) {
        // If we are not in an active state or the mention has been completed return null so nothing is rendered
        // other components are not blocked.
        return null;
    }

    return (
        <SectionList
            keyboardShouldPersistTaps='always'
            keyExtractor={keyExtractor}
            initialNumToRender={10}
            nestedScrollEnabled={nestedScrollEnabled}
            removeClippedSubviews={Platform.OS === 'android'}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            style={listStyle}
            sections={sections}
            testID='channel_mention_suggestion.list'
        />
    );
};

export default ChannelMention;
