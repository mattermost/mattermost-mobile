// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {Keyboard, View} from 'react-native';
import {ImageResource, Navigation, OptionsTopBarButton} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {switchToChannel} from '@actions/local/channel';
import {fetchArchivedChannels, fetchChannels, fetchSharedChannels, joinChannel} from '@actions/remote/channel';
import useDidUpdate from '@app/hooks/did_update';
import Loading from '@components/loading';
import SearchBar from '@components/search_bar';
import {General} from '@constants';
import {ARCHIVED, PUBLIC, SHARED} from '@constants/browse_channels';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissModal, goToScreen, setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';

import {ChannelDropdown} from './channel_dropdown';
import ChannelList from './channel_list';

import type MyChannelModel from '@typings/database/models/servers/my_channel';

type Props = {

    // Screen Props (do not change during the lifetime of the screen)
    componentId: string;
    categoryId?: string;
    closeButton: ImageResource;

    // Calculated Props
    canCreateChannels: boolean;
    currentUserId: string;
    currentTeamId: string;
    joinedChannels?: MyChannelModel[];
    sharedChannelsEnabled: boolean;
    canShowArchivedChannels: boolean;
}

const CLOSE_BUTTON_ID = 'close-browse-channels';
const CREATE_BUTTON_ID = 'create-pub-channel';

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

export default function BrowseChannels({
    componentId,
    canCreateChannels,
    joinedChannels = [],
    sharedChannelsEnabled,
    closeButton,
    currentUserId,
    currentTeamId,
    canShowArchivedChannels,
    categoryId,
}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const serverUrl = useServerUrl();

    const [channels, setChannels] = useState<Channel[]>([]);
    const [archivedChannels, setArchivedChannels] = useState<Channel[]>([]);
    const [sharedChannels, setSharedChannels] = useState<Channel[]>([]);

    const [visibleChannels, setVisibleChannels] = useState<Channel[]>([]);
    const [typeOfChannels, setTypeOfChannels] = useState(PUBLIC);

    const [term, setTerm] = useState('');

    const [adding, setAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    const mounted = useRef(false);
    const publicPage = useRef(-1);
    const sharedPage = useRef(-1);
    const archivedPage = useRef(-1);
    const nextPublic = useRef(true);
    const nextShared = useRef(true);
    const nextArchived = useRef(true);

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
                    defaultMessage: "We couldn't join the channel {displayName}. Please check your connection and try again.",
                },
                {
                    displayName: channel ? channel.display_name : '',
                },
            );
            setHeaderButtons(true);
            setAdding(false);
        } else {
            close();
            switchToChannel(serverUrl, channel.id, currentTeamId);
        }
    }, [setHeaderButtons, serverUrl, currentUserId, currentTeamId, intl.locale]);

    const doGetChannels = useCallback(() => {
        if (!loading && mounted.current) {
            const loadedChannels = async (data: Channel[] | undefined) => {
                if (mounted.current) {
                    switch (typeOfChannels) {
                        case PUBLIC: {
                            publicPage.current += 1;
                            nextPublic.current = Boolean(data?.length);
                            const filtered = filterJoinedChannels(joinedChannels, data);
                            if (filtered?.length) {
                                setChannels([...channels, ...filtered]);
                            }
                            if (data?.length && !filtered?.length) {
                                doGetChannels();
                            } else {
                                setLoading(false);
                            }
                            break;
                        }
                        case SHARED: {
                            sharedPage.current += 1;
                            nextShared.current = Boolean(data?.length);
                            const filtered = filterJoinedChannels(joinedChannels, data);
                            if (filtered?.length) {
                                setSharedChannels([...sharedChannels, ...filtered]);
                            }
                            if (data?.length && !filtered?.length) {
                                doGetChannels();
                            } else {
                                setLoading(false);
                            }
                            break;
                        }
                        case ARCHIVED:
                        default:
                            archivedPage.current += 1;
                            nextArchived.current = Boolean(data?.length);
                            if (data?.length) {
                                setArchivedChannels([...archivedChannels, ...data]);
                            }
                            setLoading(false);

                            break;
                    }
                }
            };
            switch (typeOfChannels) {
                case PUBLIC:
                    if (nextPublic.current) {
                        setLoading(true);
                        fetchChannels(
                            serverUrl,
                            currentTeamId,
                            publicPage.current + 1,
                            General.CHANNELS_CHUNK_SIZE,
                        ).then(({channels: receivedChannels}) => loadedChannels(receivedChannels || [])); // Handle error?
                    }
                    break;
                case SHARED:
                    if (nextShared.current) {
                        setLoading(true);
                        fetchSharedChannels(
                            serverUrl,
                            currentTeamId,
                            sharedPage.current + 1,
                            General.CHANNELS_CHUNK_SIZE,
                        ).then(({channels: receivedChannels}) => loadedChannels(receivedChannels || []));
                    }
                    break;
                case ARCHIVED:
                default:
                    if (canShowArchivedChannels && nextArchived.current) {
                        setLoading(true);
                        fetchArchivedChannels(
                            serverUrl,
                            currentTeamId,
                            archivedPage.current + 1,
                            General.CHANNELS_CHUNK_SIZE,
                        ).then(({channels: receivedChannels}) => loadedChannels(receivedChannels || []));
                    }
                    break;
            }
        }
    }, [loading, typeOfChannels, joinedChannels, archivedChannels, channels, sharedChannels, serverUrl, currentTeamId]);

    const selectActiveChannels = useCallback(() => {
        switch (typeOfChannels) {
            case ARCHIVED:
                return archivedChannels;
            case SHARED:
                return sharedChannels;
            default:
                return channels;
        }
    }, [archivedChannels, channels, sharedChannels, typeOfChannels]);

    const stopSearch = useCallback(() => {
        setVisibleChannels(selectActiveChannels());
        setTerm('');
    }, [selectActiveChannels]);

    const searchChannels = useCallback((text: string) => {
        if (text) {
            const active = selectActiveChannels();
            const filtered = filterChannelsByTerm(active, text);
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
    }, [selectActiveChannels, visibleChannels, stopSearch]);

    const onPressDropdownElement = useCallback((channelType: string) => {
        setTypeOfChannels(channelType);
    }, []);

    const renderLoading = useCallback(() => {
        return (
            <Loading
                containerStyle={style.loadingContainer}
                style={style.loading}
                color={theme.buttonBg}
            />
        );

    //Style is covered by the theme
    }, [theme]);

    useEffect(() => {
        mounted.current = true;
        doGetChannels();
        return () => {
            mounted.current = false;
        };
    }, []);

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

                        // Go to or show modal?
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

    useDidUpdate(() => {
        doGetChannels();

        // Since doGetChannels also depends on typeOfChannels, it should be up to date when reaching this effect.
    }, [typeOfChannels]);

    useDidUpdate(() => {
        const active = selectActiveChannels();
        if (term) {
            setVisibleChannels(filterChannelsByTerm(active, term));
        } else {
            setVisibleChannels(active);
        }
    }, [selectActiveChannels]);

    useEffect(() => {
        // Update header buttons in case anything related to the header changes
        setHeaderButtons(!adding);
    }, [theme, canCreateChannels]);

    let content;
    if (adding) {
        content = renderLoading();
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
                    doGetChannels={doGetChannels}
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
