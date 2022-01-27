// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {ImageResource} from 'react-native-navigation';

import {fetchArchivedChannels, fetchChannels, fetchSharedChannels} from '@actions/remote/channel';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import useDidUpdate from '@hooks/did_update';

import BrowseChannels, {ARCHIVED, PUBLIC, SHARED} from './browse_channels';

import type MyChannelModel from '@typings/database/models/servers/my_channel';

type Props = {

    // Screen Props (do not change during the lifetime of the screen)
    componentId: string;
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

const filterChannelsByTerm = (channels: Channel[], term: string) => {
    const lowerCasedTerm = term.toLowerCase();
    return channels.filter((c) => {
        return (c.name.toLowerCase().includes(lowerCasedTerm) || c.display_name.toLowerCase().includes(lowerCasedTerm));
    });
};

const filterJoinedChannels = (joinedChannels: MyChannelModel[], allChannels: Channel[] | undefined) => {
    const ids = joinedChannels.map((c) => c.id);
    return allChannels?.filter((c) => !ids.includes(c.id));
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

    const doGetChannels = (t: string) => {
        switch (t) {
            case PUBLIC:
                if (nextPublic.current) {
                    dispatch(LoadAction);
                    fetchChannels(
                        serverUrl,
                        currentTeamId,
                        publicPage.current + 1,
                        General.CHANNELS_CHUNK_SIZE,
                    ).then(
                        ({channels: receivedChannels}) => loadedChannels.current(receivedChannels || [], t),
                    ).catch(
                        () => dispatch(StopAction),
                    );
                }
                break;
            case SHARED:
                if (nextShared.current) {
                    dispatch(LoadAction);
                    fetchSharedChannels(
                        serverUrl,
                        currentTeamId,
                        sharedPage.current + 1,
                        General.CHANNELS_CHUNK_SIZE,
                    ).then(
                        ({channels: receivedChannels}) => loadedChannels.current(receivedChannels || [], t),
                    ).catch(
                        () => dispatch(StopAction),
                    );
                }
                break;
            case ARCHIVED:
                if (nextArchived.current) {
                    dispatch(LoadAction);
                    fetchArchivedChannels(
                        serverUrl,
                        currentTeamId,
                        archivedPage.current + 1,
                        General.CHANNELS_CHUNK_SIZE,
                    ).then(
                        ({channels: receivedChannels}) => loadedChannels.current(receivedChannels || [], t),
                    ).catch(
                        () => dispatch(StopAction),
                    );
                }
                break;
        }
    };

    const onEndReached = useCallback(() => {
        if (!loading) {
            doGetChannels(typeOfChannels);
        }
    }, [typeOfChannels, loading]);

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
        setVisibleChannels(activeChannels);
        setTerm('');
    }, [activeChannels]);

    const searchChannels = useCallback((text: string) => {
        if (text) {
            const filtered = filterChannelsByTerm(activeChannels, text);
            setTerm(text);
            if (
                filtered.length !== visibleChannels.length ||
                filtered.reduce((shouldUpdate, c, i) => shouldUpdate || c.id !== visibleChannels[i].id, false)
            ) {
                setVisibleChannels(filtered);
            }
        } else {
            stopSearch();
        }
    }, [activeChannels, visibleChannels, stopSearch]);

    const changeChannelType = useCallback((channelType: string) => {
        setTypeOfChannels(channelType);
    }, []);

    useEffect(() => {
        loadedChannels.current = async (data: Channel[] | undefined, t: string) => {
            switch (t) {
                case PUBLIC: {
                    publicPage.current += 1;
                    nextPublic.current = Boolean(data?.length);
                    const filtered = filterJoinedChannels(joinedChannels, data);
                    if (filtered?.length) {
                        dispatch(addAction(t, filtered));
                    } else if (data?.length) {
                        doGetChannels(t);
                    } else {
                        dispatch(StopAction);
                    }
                    break;
                }
                case SHARED: {
                    sharedPage.current += 1;
                    nextShared.current = Boolean(data?.length);
                    const filtered = filterJoinedChannels(joinedChannels, data);
                    if (filtered?.length) {
                        dispatch(addAction(t, filtered));
                    } else if (data?.length && !filtered?.length) {
                        doGetChannels(t);
                    } else {
                        dispatch(StopAction);
                    }
                    break;
                }
                case ARCHIVED:
                default:
                    archivedPage.current += 1;
                    nextArchived.current = Boolean(data?.length);
                    if (data?.length) {
                        dispatch(addAction(t, data));
                    } else {
                        dispatch(StopAction);
                    }

                    break;
            }
        };
        return () => {
            loadedChannels.current = async () => {/* Do nothing */};
        };
    }, [joinedChannels]);

    useEffect(() => {
        doGetChannels(typeOfChannels);
    }, [typeOfChannels]);

    useDidUpdate(() => {
        if (term) {
            setVisibleChannels(filterChannelsByTerm(activeChannels, term));
        } else {
            setVisibleChannels(activeChannels);
        }
    }, [activeChannels]);

    // Make sure enough channels are loaded to allow the FlatList to scroll,
    // and let it call the onReachEnd function.
    useDidUpdate(() => {
        if (loading) {
            return;
        }
        if (visibleChannels.length >= MIN_CHANNELS_LOADED) {
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
    }, [visibleChannels, loading]);

    return (
        <BrowseChannels
            {...passProps}
            currentTeamId={currentTeamId}
            changeChannelType={changeChannelType}
            channels={visibleChannels}
            loading={loading}
            onEndReached={onEndReached}
            searchChannels={searchChannels}
            stopSearch={stopSearch}
            term={term}
            typeOfChannels={typeOfChannels}
        />
    );
}
