// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';

import {fetchArchivedChannels, fetchChannels, fetchSharedChannels, searchChannels} from '@actions/remote/channel';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import useDidUpdate from '@hooks/did_update';

import BrowseChannels, {ARCHIVED, PUBLIC, SHARED} from './browse_channels';

import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {AvailableScreens} from '@typings/screens/navigation';
import type {ImageResource} from 'react-native-navigation';

type Props = {

    // Screen Props (do not change during the lifetime of the screen)
    componentId: AvailableScreens;
    categoryId?: string;
    closeButton: ImageResource;

    // Properties not changing during the lifetime of the screen)
    currentUserId: string;
    currentTeamId: string;

    // Calculated Props
    canCreateChannels: boolean;
    joinedChannels?: MyChannelModel[];
    sharedChannelsEnabled: boolean;
    canShowArchivedChannels: boolean;
}

const MIN_CHANNELS_LOADED = 10;

const LOAD = 'load';
const STOP = 'stop';

const filterChannelsByType = (channels: Channel[], joinedChannels: MyChannelModel[], channelType: string) => {
    const ids = new Set(joinedChannels.map((c) => c.id));
    let filter: (c: Channel) => boolean;
    switch (channelType) {
        case ARCHIVED:
            filter = (c) => c.delete_at !== 0;
            break;
        case SHARED:
            filter = (c) => c.delete_at === 0 && c.shared && !ids.has(c.id);
            break;
        case PUBLIC:
        default:
            filter = (c) => c.delete_at === 0 && !c.shared && !ids.has(c.id);
            break;
    }
    return channels.filter(filter);
};

const filterJoinedChannels = (joinedChannels: MyChannelModel[], allChannels: Channel[] | undefined) => {
    const ids = new Set(joinedChannels.map((c) => c.id));
    return allChannels?.filter((c) => !ids.has(c.id));
};

type State = {
    channels: Channel[];
    archivedChannels: Channel[];
    sharedChannels: Channel[];
    loading: boolean;
}

type Action = {
    type: string;
    data: Channel[];
}

const LoadAction: Action = {type: LOAD, data: []};
const StopAction: Action = {type: STOP, data: []};
const addAction = (t: string, data: Channel[]) => {
    return {type: t, data};
};

const reducer = (state: State, action: Action) => {
    switch (action.type) {
        case PUBLIC:
            return {
                ...state,
                channels: [...state.channels, ...action.data],
                loading: false,
            };
        case ARCHIVED:
            return {
                ...state,
                archivedChannels: [...state.archivedChannels, ...action.data],
                loading: false,
            };
        case SHARED:
            return {
                ...state,
                sharedChannels: [...state.sharedChannels, ...action.data],
                loading: false,
            };
        case LOAD:
            if (state.loading) {
                return state;
            }
            return {
                ...state,
                loading: true,
            };
        case STOP:
            if (state.loading) {
                return {
                    ...state,
                    loading: false,
                };
            }
            return state;
        default:
            return state;
    }
};

const initialState = {channels: [], archivedChannels: [], sharedChannels: [], loading: false};
const defaultJoinedChannels: MyChannelModel[] = [];
const defaultSearchResults: Channel[] = [];

export default function SearchHandler(props: Props) {
    const {
        joinedChannels = defaultJoinedChannels,
        currentTeamId,
        ...passProps
    } = props;
    const serverUrl = useServerUrl();

    const [{channels, archivedChannels, sharedChannels, loading}, dispatch] = useReducer(reducer, initialState);

    const [visibleChannels, setVisibleChannels] = useState<Channel[]>([]);
    const [term, setTerm] = useState('');

    const [typeOfChannels, setTypeOfChannels] = useState(PUBLIC);

    const publicPage = useRef(-1);
    const sharedPage = useRef(-1);
    const archivedPage = useRef(-1);
    const nextPublic = useRef(true);
    const nextShared = useRef(true);
    const nextArchived = useRef(true);
    const loadedChannels = useRef<(data: Channel[] | undefined, typeOfChannels: string) => Promise<void>>(async () => {/* Do nothing */});

    const searchTimeout = useRef<NodeJS.Timeout>();
    const [searchResults, setSearchResults] = useState<Channel[]>(defaultSearchResults);

    const isSearch = Boolean(term);

    const doGetChannels = (t: string) => {
        let next: (typeof nextPublic | typeof nextShared | typeof nextArchived);
        let fetch: (typeof fetchChannels | typeof fetchSharedChannels | typeof fetchArchivedChannels);
        let page: (typeof publicPage | typeof sharedPage | typeof archivedPage);

        switch (t) {
            case SHARED:
                next = nextShared;
                fetch = fetchSharedChannels;
                page = sharedPage;
                break;
            case ARCHIVED:
                next = nextArchived;
                fetch = fetchArchivedChannels;
                page = archivedPage;
                break;
            case PUBLIC:
            default:
                next = nextPublic;
                fetch = fetchChannels;
                page = publicPage;
        }

        if (next.current) {
            dispatch(LoadAction);
            fetch(
                serverUrl,
                currentTeamId,
                page.current + 1,
                General.CHANNELS_CHUNK_SIZE,
            ).then(
                ({channels: receivedChannels}) => loadedChannels.current(receivedChannels, t),
            ).catch(
                () => dispatch(StopAction),
            );
        }
    };

    const onEndReached = useCallback(() => {
        if (!loading && !term) {
            doGetChannels(typeOfChannels);
        }
    }, [typeOfChannels, loading, term]);

    let activeChannels: Channel[];
    switch (typeOfChannels) {
        case ARCHIVED:
            activeChannels = archivedChannels;
            break;
        case SHARED:
            activeChannels = sharedChannels;
            break;
        default:
            activeChannels = channels;
    }

    const stopSearch = useCallback(() => {
        setSearchResults(defaultSearchResults);
        setTerm('');
    }, [activeChannels]);

    const doSearchChannels = useCallback((text: string) => {
        if (text) {
            setSearchResults(defaultSearchResults);
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
            searchTimeout.current = setTimeout(async () => {
                const results = await searchChannels(serverUrl, text, currentTeamId);
                if (results.channels) {
                    setSearchResults(results.channels);
                }
                dispatch(StopAction);
            }, 500);
            setTerm(text);
            setVisibleChannels(searchResults);
            dispatch(LoadAction);
        } else {
            stopSearch();
        }
    }, [activeChannels, visibleChannels, joinedChannels, stopSearch]);

    const changeChannelType = useCallback((channelType: string) => {
        setTypeOfChannels(channelType);
    }, []);

    useEffect(() => {
        loadedChannels.current = async (data: Channel[] | undefined, t: string) => {
            let next: (typeof nextPublic | typeof nextShared | typeof nextArchived);
            let page: (typeof publicPage | typeof sharedPage | typeof archivedPage);
            let shouldFilterJoined: boolean;
            switch (t) {
                case SHARED:
                    page = sharedPage;
                    next = nextShared;
                    shouldFilterJoined = true;
                    break;
                case ARCHIVED:
                    page = archivedPage;
                    next = nextArchived;
                    shouldFilterJoined = false;
                    break;
                case PUBLIC:
                default:
                    page = publicPage;
                    next = nextPublic;
                    shouldFilterJoined = true;
            }
            page.current += 1;
            next.current = Boolean(data?.length);
            let filtered = data;
            if (shouldFilterJoined) {
                filtered = filterJoinedChannels(joinedChannels, data);
            }
            if (filtered?.length) {
                dispatch(addAction(t, filtered));
            } else if (data?.length) {
                doGetChannels(t);
            } else {
                dispatch(StopAction);
            }
        };
        return () => {
            loadedChannels.current = async () => {/* Do nothing */};
        };
    }, [joinedChannels]);

    useEffect(() => {
        if (!isSearch) {
            doGetChannels(typeOfChannels);
        }
    }, [typeOfChannels, isSearch]);

    useDidUpdate(() => {
        if (isSearch) {
            setVisibleChannels(filterChannelsByType(searchResults, joinedChannels, typeOfChannels));
        } else {
            setVisibleChannels(activeChannels);
        }
    }, [activeChannels, isSearch && searchResults, isSearch && typeOfChannels, joinedChannels]);

    // Make sure enough channels are loaded to allow the FlatList to scroll,
    // and let it call the onReachEnd function.
    useDidUpdate(() => {
        if (loading || isSearch || visibleChannels.length >= MIN_CHANNELS_LOADED) {
            return;
        }
        let next;
        switch (typeOfChannels) {
            case PUBLIC:
                next = nextPublic.current;
                break;
            case SHARED:
                next = nextShared.current;
                break;
            default:
                next = nextArchived.current;
        }
        if (next) {
            doGetChannels(typeOfChannels);
        }
    }, [visibleChannels.length >= MIN_CHANNELS_LOADED, loading, isSearch]);

    return (
        <BrowseChannels
            {...passProps}
            currentTeamId={currentTeamId}
            changeChannelType={changeChannelType}
            channels={visibleChannels}
            loading={loading}
            onEndReached={onEndReached}
            searchChannels={doSearchChannels}
            stopSearch={stopSearch}
            term={term}
            typeOfChannels={typeOfChannels}
        />
    );
}
