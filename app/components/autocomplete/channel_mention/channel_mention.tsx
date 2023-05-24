// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, SectionList, type SectionListData, type SectionListRenderItemInfo, type StyleProp, type ViewStyle} from 'react-native';

import {searchChannels} from '@actions/remote/channel';
import AutocompleteSectionHeader from '@components/autocomplete/autocomplete_section_header';
import ChannelItem from '@components/channel_item';
import {General} from '@constants';
import {CHANNEL_MENTION_REGEX, CHANNEL_MENTION_SEARCH_REGEX} from '@constants/autocomplete';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import useDidUpdate from '@hooks/did_update';
import {t} from '@i18n';
import {getUserById} from '@queries/servers/user';
import {hasTrailingSpaces} from '@utils/helpers';
import {getUserIdFromChannelName} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const keyExtractor = (item: Channel) => {
    return item.id;
};

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

const makeSections = (channels: Array<Channel | ChannelModel>, myMembers: MyChannelModel[], loading: boolean, isSearch = false) => {
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

        if (otherChannels.length || (!myChannels.length && loading)) {
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

const filterResults = (channels: Array<Channel | ChannelModel>, term: string) => {
    return channels.filter((c) => {
        const displayName = ('displayName' in c ? c.displayName : c.display_name).toLowerCase();
        return c.name.toLowerCase().includes(term) ||
            displayName.includes(term);
    });
};

type Props = {
    cursorPosition: number;
    isSearch: boolean;
    myMembers: MyChannelModel[];
    updateValue: (v: string) => void;
    onShowingChange: (c: boolean) => void;
    value: string;
    nestedScrollEnabled: boolean;
    listStyle: StyleProp<ViewStyle>;
    matchTerm: string;
    localChannels: ChannelModel[];
    teamId: string;
    currentUserId: string;
}

const emptySections: Array<SectionListData<Channel>> = [];
const emptyChannels: Array<Channel | ChannelModel> = [];

const ChannelMention = ({
    cursorPosition,
    isSearch,
    myMembers,
    updateValue,
    onShowingChange,
    value,
    nestedScrollEnabled,
    listStyle,
    matchTerm,
    localChannels,
    teamId,
    currentUserId,
}: Props) => {
    const serverUrl = useServerUrl();

    const [sections, setSections] = useState<Array<SectionListData<(Channel | ChannelModel)>>>(emptySections);
    const [remoteChannels, setRemoteChannels] = useState<Array<ChannelModel | Channel>>(emptyChannels);
    const [loading, setLoading] = useState(false);
    const [noResultsTerm, setNoResultsTerm] = useState<string|null>(null);
    const [localCursorPosition, setLocalCursorPosition] = useState(cursorPosition); // To avoid errors due to delay between value changes and cursor position changes.

    const latestSearchAt = useRef(0);

    const runSearch = useMemo(() => debounce(async (sUrl: string, term: string, tId: string) => {
        const searchAt = Date.now();
        latestSearchAt.current = searchAt;

        const {channels: receivedChannels} = await searchChannels(sUrl, term, tId, isSearch);

        if (latestSearchAt.current > searchAt) {
            return;
        }
        let channelsToStore: Array<Channel | ChannelModel> = receivedChannels || [];
        if (hasTrailingSpaces(term)) {
            channelsToStore = filterResults(receivedChannels || [], term);
        }
        setRemoteChannels(channelsToStore.length ? channelsToStore : emptyChannels);

        setLoading(false);
    }, 200), []);

    const resetState = () => {
        latestSearchAt.current = Date.now();
        setRemoteChannels(emptyChannels);
        setSections(emptySections);
        setNoResultsTerm(null);
        runSearch.cancel();
        setLoading(false);
    };

    const completeMention = useCallback(async (c: ChannelModel | Channel) => {
        let mention = c.name;
        const teammateId = getUserIdFromChannelName(currentUserId, c.name);

        if (c.type === General.DM_CHANNEL && teammateId) {
            try {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const user = await getUserById(database, teammateId);
                if (user) {
                    mention = `@${user.username}`;
                }
            } catch (err) {
                // Do nothing
            }
        }

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
        setLoading(false);
        setNoResultsTerm(mention);
        setSections(emptySections);
        setRemoteChannels(emptyChannels);
        latestSearchAt.current = Date.now();
    }, [value, localCursorPosition, isSearch, currentUserId]);

    const renderItem = useCallback(({item}: SectionListRenderItemInfo<Channel | ChannelModel>) => {
        return (
            <ChannelItem
                channel={item}
                onPress={completeMention}
                testID='autocomplete.channel_mention_item'
                isOnCenterBg={true}
                showChannelName={true}
            />
        );
    }, [completeMention]);

    const renderSectionHeader = useCallback(({section}: SectionListRenderItemInfo<Channel | ChannelModel>) => {
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
        setLoading(true);
        runSearch(serverUrl, matchTerm, teamId);
    }, [matchTerm, teamId]);

    const channels = useMemo(() => {
        const ids = new Set(localChannels.map((c) => c.id));
        return [...localChannels, ...remoteChannels.filter((c) => !ids.has(c.id))].sort((a, b) => {
            const aDisplay = 'display_name' in a ? a.display_name : a.displayName;
            const bDisplay = 'display_name' in b ? b.display_name : b.displayName;
            const displayResult = aDisplay.localeCompare(bDisplay);
            if (displayResult === 0) {
                return a.name.localeCompare(b.name);
            }
            return displayResult;
        });
    }, [localChannels, remoteChannels]);

    useDidUpdate(() => {
        if (noResultsTerm && !loading) {
            return;
        }
        const newSections = makeSections(channels, myMembers, loading, isSearch);
        const nSections = newSections.length;

        if (!loading && !nSections && noResultsTerm == null) {
            setNoResultsTerm(matchTerm);
        }
        if (nSections) {
            setNoResultsTerm(null);
        }
        setSections(newSections.length ? newSections : emptySections);
        onShowingChange(Boolean(nSections));
    }, [channels, myMembers, loading]);

    if (!loading && (sections.length === 0 || noResultsTerm != null)) {
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
            testID='autocomplete.channel_mention.section_list'
        />
    );
};

export default ChannelMention;
