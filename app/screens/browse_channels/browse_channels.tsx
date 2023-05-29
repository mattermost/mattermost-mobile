// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {Keyboard, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {joinChannel, switchToChannelById} from '@actions/remote/channel';
import ChannelSelector from '@components/channel_selector';
import {Screens, Channel} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, goToScreen, setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';

import type {AvailableScreens, NavButtons} from '@typings/screens/navigation';
import type {ImageResource, OptionsTopBarButton} from 'react-native-navigation';

const CLOSE_BUTTON_ID = 'close-browse-channels';
const CREATE_BUTTON_ID = 'create-pub-channel';

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
});

type Props = {

    // Screen Props (do not change during the lifetime of the screen)
    componentId: AvailableScreens;
    closeButton: ImageResource;

    // Properties not changing during the lifetime of the screen)
    currentTeamId: string;

    // Calculated Props
    canCreateChannels: boolean;
    sharedChannelsEnabled: boolean;
    canShowArchivedChannels: boolean;

    // SearchHandler Props
    channels: Channel[];
    loading: boolean;
    onChannelTypeChanged: (channelType: string) => void;
    onEndReached: () => void;
    onSearchChannels: (term: string) => void;
    onSearchCancel: () => void;
    typeOfChannels: string;
    term: string;
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
        onChannelTypeChanged,
        term,
        onSearchChannels,
        onSearchCancel,
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

    const handleSelectChannel = useCallback(async (channel: Channel) => {
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

    const handleCreate = useCallback(() => {
        const screen = Screens.CREATE_OR_EDIT_CHANNEL;
        const title = intl.formatMessage({id: 'mobile.create_channel.title', defaultMessage: 'New channel'});
        goToScreen(screen, title);
    }, [intl.locale]);

    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, close, [close]);
    useNavButtonPressed(CREATE_BUTTON_ID, componentId, handleCreate, [handleCreate]);
    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        // Update header buttons in case anything related to the header changes
        setHeaderButtons(!adding);
    }, [theme, canCreateChannels, adding]);

    return (
        <SafeAreaView style={style.container}>
            <ChannelSelector
                sharedChannelsEnabled={sharedChannelsEnabled}
                canShowArchivedChannels={canShowArchivedChannels}
                typeOfChannels={typeOfChannels}
                onChannelTypeChanged={onChannelTypeChanged}
                term={term}
                onSearchChannels={onSearchChannels}
                onSearchCancel={onSearchCancel}
                channels={channels}
                adding={adding}
                loading={loading}
                noResultsWithoutTerm={intl.formatMessage({id: 'browse_channels.noMore', defaultMessage: 'No more channels to join'})}
                onEndReached={onEndReached}
                onSelectChannel={handleSelectChannel}
            />
        </SafeAreaView>
    );
}
