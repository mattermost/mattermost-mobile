// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {Keyboard, Platform, StyleSheet, View} from 'react-native';
import {ImageResource, OptionsTopBarButton} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {joinChannel, switchToChannelById} from '@actions/remote/channel';
import ChannelList from '@components/channel_list';
import Loading from '@components/loading';
import Search from '@components/search';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, goToScreen, setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';

import ChannelDropdown from './channel_dropdown';

import type {NavButtons} from '@typings/screens/navigation';

const CLOSE_BUTTON_ID = 'close-browse-channels';
const CREATE_BUTTON_ID = 'create-pub-channel';

export const PUBLIC = 'public';
export const SHARED = 'shared';
export const ARCHIVED = 'archived';

const makeLeftButton = (icon: ImageResource): OptionsTopBarButton => {
    return {
        id: CLOSE_BUTTON_ID,
        icon,
        testID: 'close.browse_channels.button',
    };
};

const makeRightButton = (theme: Theme, formatMessage: IntlShape['formatMessage'], enabled: boolean): OptionsTopBarButton => {
    return {
        color: theme.sidebarHeaderTextColor,
        id: CREATE_BUTTON_ID,
        text: formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
        showAsAction: 'always',
        testID: 'browse_channels.create.button',
        enabled,
    };
};

const close = () => {
    Keyboard.dismiss();
    dismissModal();
};

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBar: {
        marginLeft: 12,
        marginRight: Platform.select({ios: 4, default: 12}),
        marginTop: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    },
});

type Props = {

    // Screen Props (do not change during the lifetime of the screen)
    componentId: string;
    closeButton: ImageResource;

    // Properties not changing during the lifetime of the screen)
    currentTeamId: string;

    // Calculated Props
    canCreateChannels: boolean;
    sharedChannelsEnabled: boolean;
    canShowArchivedChannels: boolean;

    // SearchHandler Props
    typeOfChannels: string;
    changeChannelType: (channelType: string) => void;
    term: string;
    searchChannels: (term: string) => void;
    stopSearch: () => void;
    loading: boolean;
    onEndReached: () => void;
    channels: Channel[];
}

export default function BrowseChannels(props: Props) {
    const {
        componentId,
        canCreateChannels,
        sharedChannelsEnabled,
        closeButton,
        currentTeamId,
        canShowArchivedChannels,
        typeOfChannels,
        changeChannelType: changeTypeOfChannels,
        term,
        searchChannels,
        stopSearch,
        channels,
        loading,
        onEndReached,
    } = props;
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const [adding, setAdding] = useState(false);

    const setHeaderButtons = useCallback((createEnabled: boolean) => {
        const buttons: NavButtons = {
            leftButtons: [makeLeftButton(closeButton)],
            rightButtons: [],
        };

        if (canCreateChannels) {
            buttons.rightButtons = [makeRightButton(theme, intl.formatMessage, createEnabled)];
        }

        setButtons(componentId, buttons);
    }, [closeButton, canCreateChannels, intl.locale, theme, componentId]);

    const onSelectChannel = useCallback(async (channel: Channel) => {
        setHeaderButtons(false);
        setAdding(true);

        const result = await joinChannel(serverUrl, currentTeamId, channel.id, '', false);

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

    const onSearch = useCallback(() => {
        searchChannels(term);
    }, [term, searchChannels]);

    const handleCreate = useCallback(() => {
        const screen = Screens.CREATE_OR_EDIT_CHANNEL;
        const title = intl.formatMessage({id: 'mobile.create_channel.title', defaultMessage: 'New channel'});
        goToScreen(screen, title);
    }, [intl.locale]);

    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, close, [close]);
    useNavButtonPressed(CREATE_BUTTON_ID, componentId, handleCreate, [handleCreate]);

    useEffect(() => {
        // Update header buttons in case anything related to the header changes
        setHeaderButtons(!adding);
    }, [theme, canCreateChannels, adding]);

    let content;
    if (adding) {
        content = (
            <Loading
                containerStyle={style.loadingContainer}
                size='large'
                color={theme.buttonBg}
            />
        );
    } else {
        let channelDropdown;
        if (canShowArchivedChannels || sharedChannelsEnabled) {
            channelDropdown = (
                <ChannelDropdown
                    onPress={changeTypeOfChannels}
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
                    <Search
                        testID='browse_channels.search_bar'
                        placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                        cancelButtonTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        onChangeText={searchChannels}
                        onSubmitEditing={onSearch}
                        onCancel={stopSearch}
                        autoCapitalize='none'
                        keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                        value={term}
                    />
                </View>
                {channelDropdown}
                <ChannelList
                    channels={channels}
                    onEndReached={onEndReached}
                    loading={loading}
                    onSelectChannel={onSelectChannel}
                    term={term}
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
