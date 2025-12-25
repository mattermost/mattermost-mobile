// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, Pressable, StyleSheet, View} from 'react-native';

import {joinChannel, switchToChannelById} from '@actions/remote/channel';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import Search from '@components/search';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {alertErrorWithFallback} from '@utils/draft';
import {navigateBack, navigateToScreenWithBaseRoute} from '@utils/navigation/adapter';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';

import ChannelDropdown from './channel_dropdown';
import ChannelList from './channel_list';

export const PUBLIC = 'public';
export const SHARED = 'shared';
export const ARCHIVED = 'archived';

const close = async () => {
    Keyboard.dismiss();
    await navigateBack();
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
        canCreateChannels,
        sharedChannelsEnabled,
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
    const navigation = useNavigation();
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const [adding, setAdding] = useState(false);

    const handleCreate = useCallback(() => {
        navigateToScreenWithBaseRoute(`/(modals)/${Screens.BROWSE_CHANNELS}`, Screens.CREATE_OR_EDIT_CHANNEL);
    }, []);

    const setHeaderButtons = useCallback((createEnabled: boolean) => {
        if (canCreateChannels) {
            navigation.setOptions({
                headerRight: () => (
                    <Pressable
                        onPress={handleCreate}
                        disabled={!createEnabled}
                        testID='browse_channels.create.button'
                    >
                        <FormattedText
                            id='mobile.create_channel'
                            defaultMessage='Create'
                            style={{color: createEnabled ? theme.sidebarHeaderTextColor : changeOpacity(theme.sidebarHeaderTextColor, 0.5), fontSize: 16}}
                        />
                    </Pressable>
                ),
            });
            return;
        }
        navigation.setOptions({
            headerRight: undefined,
        });

    }, [canCreateChannels, handleCreate, navigation, theme.sidebarHeaderTextColor]);

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
            await close();
            switchToChannelById(serverUrl, channel.id, currentTeamId);
        }
    }, [setHeaderButtons, serverUrl, currentTeamId, intl]);

    const onSearch = useCallback(() => {
        searchChannels(term);
    }, [term, searchChannels]);

    useAndroidHardwareBackHandler(Screens.BROWSE_CHANNELS, close);

    useEffect(() => {
        // Update header buttons in case anything related to the header changes
        setHeaderButtons(!adding);
    }, [adding, setHeaderButtons]);

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

    return content;
}
