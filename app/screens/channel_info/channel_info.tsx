// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {ScrollView, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import ChannelActions from '@components/channel_actions';
import ChannelBookmarks from '@components/channel_bookmarks';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ChannelInfoAppBindings from './app_bindings';
import DestructiveOptions from './destructive_options';
import Extra from './extra';
import Options from './options';
import Title from './title';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    canAddBookmarks: boolean;
    channelId: string;
    closeButtonId: string;
    componentId: AvailableScreens;
    isBookmarksEnabled: boolean;
    isCallsEnabledInChannel: boolean;
    isPlaybooksEnabled: boolean;
    groupCallsAllowed: boolean;
    canManageMembers: boolean;
    isCRTEnabled: boolean;
    type?: ChannelType;
    hasChannelSettingsActions: boolean;
    isAutotranslationEnabledForThisChannel: boolean;
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    content: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    flex: {
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        marginVertical: 8,
    },
}));

const ChannelInfo = ({
    canAddBookmarks,
    canManageMembers,
    channelId,
    closeButtonId,
    componentId,
    isBookmarksEnabled,
    isCallsEnabledInChannel,
    isPlaybooksEnabled,
    groupCallsAllowed,
    isCRTEnabled,
    type,
    hasChannelSettingsActions,
    isAutotranslationEnabledForThisChannel,
}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    // NOTE: isCallsEnabledInChannel will be true/false (not undefined) based on explicit state + the DefaultEnabled system setting
    //   which comes from observeIsCallsEnabledInChannel
    let callsAvailable = isCallsEnabledInChannel;
    if (!groupCallsAllowed && type !== General.DM_CHANNEL) {
        callsAvailable = false;
    }

    const onPressed = useCallback(() => {
        return dismissModal({componentId});
    }, [componentId]);

    useNavButtonPressed(closeButtonId, componentId, onPressed, [onPressed]);
    useAndroidHardwareBackHandler(componentId, onPressed);

    return (
        <View
            style={styles.flex}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <SafeAreaView
                edges={edges}
                style={styles.flex}
                testID='channel_info.screen'
            >
                <ScrollView
                    bounces={true}
                    alwaysBounceVertical={false}
                    contentContainerStyle={styles.content}
                    testID='channel_info.scroll_view'
                >
                    <Title
                        channelId={channelId}
                        type={type}
                    />
                    {isBookmarksEnabled &&
                        <ChannelBookmarks
                            channelId={channelId}
                            canAddBookmarks={canAddBookmarks}
                            showInInfo={true}
                        />
                    }
                    <ChannelActions
                        channelId={channelId}
                        inModal={true}
                        dismissChannelInfo={onPressed}
                        callsEnabled={callsAvailable}
                        testID='channel_info.channel_actions'
                    />
                    <Extra channelId={channelId}/>
                    <View style={styles.separator}/>
                    <Options
                        channelId={channelId}
                        type={type}
                        callsEnabled={isCallsEnabledInChannel}
                        canManageMembers={canManageMembers}
                        isCRTEnabled={isCRTEnabled}
                        isPlaybooksEnabled={isPlaybooksEnabled}
                        hasChannelSettingsActions={hasChannelSettingsActions}
                        isAutotranslationEnabledForThisChannel={isAutotranslationEnabledForThisChannel}
                    />
                    <View style={styles.separator}/>
                    <ChannelInfoAppBindings
                        channelId={channelId}
                        serverUrl={serverUrl}
                        dismissChannelInfo={onPressed}
                    />
                    <DestructiveOptions
                        channelId={channelId}
                    />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

export default ChannelInfo;
