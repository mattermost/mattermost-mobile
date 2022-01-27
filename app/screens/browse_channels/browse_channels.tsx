// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {Keyboard, View} from 'react-native';
import {ImageResource, Navigation, OptionsTopBarButton} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchArchivedChannels, fetchChannels, fetchSharedChannels, joinChannel, switchToChannelById} from '@actions/remote/channel';
import useDidUpdate from '@app/hooks/did_update';
import Loading from '@components/loading';
import SearchBar from '@components/search_bar';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissModal, goToScreen, setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';

import ChannelDropdown from './channel_dropdown';
import ChannelList from './channel_list';

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

const CLOSE_BUTTON_ID = 'close-browse-channels';
const CREATE_BUTTON_ID = 'create-pub-channel';
const MIN_CHANNELS_LOADED = 10;

export const PUBLIC = 'public';
export const SHARED = 'shared';
export const ARCHIVED = 'archived';
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

const makeLeftButton = (icon: ImageResource): OptionsTopBarButton => {
    return {
        id: CLOSE_BUTTON_ID,
        icon,
        testID: 'close.browse_channels.button',
    };
};

const makeRightButton = (theme: Theme, formatMessage: IntlShape['formatMessage']): OptionsTopBarButton => {
    return {
        color: theme.sidebarHeaderTextColor,
        id: CREATE_BUTTON_ID,
        text: formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
        showAsAction: 'always',
        testID: 'browse_channels.create.button',
    };
};

const close = () => {
    Keyboard.dismiss();
    dismissModal();
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        searchBar: {
            marginHorizontal: 12,
            borderRadius: 8,
            marginTop: 12,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        searchBarInput: {
            color: theme.centerChannelColor,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
        },
        loading: {
            height: 32,
            width: 32,
            justifyContent: 'center' as const,
        },
    };
});

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

export default function BrowseChannels(props: Props) {
    const {
        componentId,
        canCreateChannels,
        joinedChannels = defaultJoinedChannels,
        sharedChannelsEnabled,
        closeButton,
        currentUserId,
        currentTeamId,
        canShowArchivedChannels,
        categoryId,
    } = props;
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const serverUrl = useServerUrl();

    const [{channels, archivedChannels, sharedChannels, loading}, dispatch] = useReducer(reducer, initialState);

    const [visibleChannels, setVisibleChannels] = useState<Channel[]>([]);
    const [term, setTerm] = useState('');

    const [typeOfChannels, setTypeOfChannels] = useState(PUBLIC);
    const [adding, setAdding] = useState(false);

    const publicPage = useRef(-1);
    const sharedPage = useRef(-1);
    const archivedPage = useRef(-1);
    const nextPublic = useRef(true);
    const nextShared = useRef(true);
    const nextArchived = useRef(true);
    const loadedChannels = useRef<(data: Channel[] | undefined, typeOfChannels: string) => Promise<void>>(async () => {/* Do nothing */});

    const setHeaderButtons = useCallback((createEnabled: boolean) => {
        const buttons = {
            leftButtons: [makeLeftButton(closeButton)],
            rightButtons: [] as OptionsTopBarButton[],
        };

        if (canCreateChannels) {
            buttons.rightButtons = [{...makeRightButton(theme, intl.formatMessage), enabled: createEnabled}];
        }

        setButtons(componentId, buttons);
    }, [closeButton, canCreateChannels, intl.locale, theme, componentId]);

    const onSelectChannel = useCallback(async (channel: Channel) => {
        setHeaderButtons(false);
        setAdding(true);

        const result = await joinChannel(serverUrl, currentUserId, currentTeamId, channel.id, '', false);

        if (result.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                {
                    id: 'mobile.join_channel.error',
                    defaultMessage: "We couldn't join the channel {displayName}.",
                },
                {
                    displayName: channel.display_name,
                },
            );
            setHeaderButtons(true);
            setAdding(false);
        } else {
            switchToChannelById(serverUrl, channel.id, currentTeamId);
            close();
        }
    }, [setHeaderButtons, intl.locale]);

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
                if (canShowArchivedChannels && nextArchived.current) {
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

    const onPressDropdownElement = useCallback((channelType: string) => {
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
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                switch (buttonId) {
                    case CLOSE_BUTTON_ID:
                        close();
                        break;
                    case CREATE_BUTTON_ID: {
                        // TODO part of https://mattermost.atlassian.net/browse/MM-39733
                        // Update this to use the proper constant and the proper props.
                        const screen = 'CreateChannel';
                        const title = intl.formatMessage({id: 'mobile.create_channel.public', defaultMessage: 'New Public Channel'});
                        const passProps = {
                            channelType: General.OPEN_CHANNEL,
                            categoryId,
                        };

                        goToScreen(screen, title, passProps);
                        break;
                    }
                }
            },
        }, componentId);
        return () => {
            unsubscribe.remove();
        };
    }, [intl.locale, categoryId]);

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

    useEffect(() => {
        // Update header buttons in case anything related to the header changes
        setHeaderButtons(!adding);
    }, [theme, canCreateChannels]);

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

    let content;
    if (adding) {
        content = (
            <Loading
                containerStyle={style.loadingContainer}
                style={style.loading}
                color={theme.buttonBg}
            />
        );
    } else {
        let channelDropdown;
        if (canShowArchivedChannels || sharedChannelsEnabled) {
            channelDropdown = (
                <ChannelDropdown
                    onPress={onPressDropdownElement}
                    typeOfChannels={typeOfChannels}
                    canShowArchivedChannels={canShowArchivedChannels}
                    sharedChannelsEnabled={sharedChannelsEnabled}
                />
            );
        }

        content = (
            <>
                <View
                    testID='browse_channels.screen'
                    style={style.searchBar}
                >
                    <SearchBar
                        testID='browse_channels.search_bar'
                        placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                        cancelTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        backgroundColor='transparent'
                        inputHeight={33}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        tintColorSearch={changeOpacity(theme.centerChannelColor, 0.5)}
                        tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                        titleCancelColor={theme.centerChannelColor}
                        inputStyle={style.searchBarInput}
                        onChangeText={searchChannels}
                        onSearchButtonPress={searchChannels}
                        onCancelButtonPress={stopSearch}
                        autoCapitalize='none'
                        keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                        value={term}
                    />
                </View>
                {channelDropdown}
                <ChannelList
                    channels={visibleChannels}
                    onEndReached={onEndReached}
                    isSearch={Boolean(term)}
                    loading={loading}
                    onSelectChannel={onSelectChannel}
                />
            </>
        );
    }

    return (
        <SafeAreaView style={style.container}>
            {content}
        </SafeAreaView>
    );
}
