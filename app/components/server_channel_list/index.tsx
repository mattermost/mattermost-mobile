// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {fetchChannels, searchChannels as searchChannelsRemote} from '@actions/remote/channel';
import {filterChannelsMatchingTerm} from '@app/utils/channel';
import ChannelList from '@components/channel_list';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {debounce} from '@helpers/api/general';

type Props = {
    handleSelectChannel: (channel: Channel) => void;
    term: string;
    currentTeamId: string;
    selectable?: boolean;
}

function handleIdSelection(currentIds: {[id: string]: Channel}, user: Channel) {
    const newSelectedIds = {...currentIds};
    const wasSelected = currentIds[user.id];

    if (wasSelected) {
        Reflect.deleteProperty(newSelectedIds, user.id);
    } else {
        newSelectedIds[user.id] = user;
    }

    return newSelectedIds;
}

export default function ServerChannelList({
    handleSelectChannel,
    term,
    currentTeamId,
    selectable = false,
}: Props) {
    const serverUrl = useServerUrl();

    const next = useRef(true);
    const page = useRef(-1);
    const mounted = useRef(false);

    const [stateChannels, setStateChannels] = useState<Channel[]>([]);
    const [searchResults, setSearchResults] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: Channel}>({});
    const selectedCount = Object.keys(selectedIds).length;

    const isSearch = Boolean(term);

    const loadedChannels = ({channels}: {channels?: Channel[]}) => {
        if (mounted.current) {
            if (channels && !channels.length) {
                next.current = false;
            }

            page.current += 1;
            setLoading(false);
            setStateChannels((current) => {
                if (channels?.length) {
                    return [...current, ...channels];
                }

                return current;
            });
        }
    };

    const getChannels = useCallback(debounce(() => {
        if (next.current && !loading && !term && mounted.current) {
            setLoading(true);
            fetchChannels(serverUrl, currentTeamId, page.current + 1, General.PROFILE_CHUNK_SIZE).then(loadedChannels);
        }
    }, 100), [loading, isSearch, serverUrl]);

    const onHandleSelectChannel = useCallback((channel: Channel) => {
        handleSelectChannel(channel);
        setSelectedIds((current) => handleIdSelection(current, channel));
    }, [handleSelectChannel]);

    const searchChannels = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        setLoading(true);
        const {channels} = await searchChannelsRemote(serverUrl, lowerCasedTerm, currentTeamId);

        let data: Channel[] = [];
        if (channels) {
            data = channels;
        }

        setSearchResults(data);
        setLoading(false);
    }, [serverUrl]);

    const onEndReached = () => {
        // TODO
    };

    useEffect(() => {
        searchChannels(term);
    }, [term]);

    useEffect(() => {
        mounted.current = true;
        getChannels();
        return () => {
            mounted.current = false;
        };
    }, []);

    const data = useMemo(() => {
        if (term) {
            const exactMatches: Channel[] = [];
            const filterByTerm = (channel: Channel) => {
                if (selectedCount > 0) {
                    return false;
                }

                if (channel.name === term || channel.name.startsWith(term)) {
                    exactMatches.push(channel);
                    return false;
                }

                return true;
            };

            const results = filterChannelsMatchingTerm(searchResults, term).filter(filterByTerm);
            return [...exactMatches, ...results];
        }
        return stateChannels;
    }, [term, isSearch && selectedCount, isSearch && searchResults, stateChannels]);

    return (
        <ChannelList
            term={term}
            onSelectChannel={onHandleSelectChannel}
            channels={data}
            loading={false}
            onEndReached={onEndReached}
            selectable={selectable}
            selectedIds={selectedIds}
        />
    );
}
