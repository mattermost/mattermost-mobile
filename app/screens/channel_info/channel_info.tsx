// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {ScrollView, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import ChannelInfoEnableCalls from '@calls/components/channel_info_enable_calls';
import ChannelActions from '@components/channel_actions';
import ConvertToChannelLabel from '@components/channel_actions/convert_to_channel/convert_to_channel_label';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ChannelInfoAppBindings from './app_bindings';
import DestructiveOptions from './destructive_options';
import Extra from './extra';
import Options from './options';
import Title from './title';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    closeButtonId: string;
    componentId: AvailableScreens;
    type?: ChannelType;
    canEnableDisableCalls: boolean;
    isCallsEnabledInChannel: boolean;
    canManageMembers: boolean;
    isCRTEnabled: boolean;
    canManageSettings: boolean;
    isGuestUser: boolean;
    isConvertGMFeatureAvailable: boolean;
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
    isCRTEnabled,
    channelId,
    closeButtonId,
    componentId,
    type,
    canEnableDisableCalls,
    isCallsEnabledInChannel,
    canManageMembers,
    canManageSettings,
    isGuestUser,
    isConvertGMFeatureAvailable,
}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    // NOTE: isCallsEnabledInChannel will be true/false (not undefined) based on explicit state + the DefaultEnabled system setting
    //   which comes from observeIsCallsEnabledInChannel
    const callsAvailable = isCallsEnabledInChannel;

    const onPressed = useCallback(() => {
        return dismissModal({componentId});
    }, [componentId]);

    useNavButtonPressed(closeButtonId, componentId, onPressed, [onPressed]);
    useAndroidHardwareBackHandler(componentId, onPressed);

    const convertGMOptionAvailable = isConvertGMFeatureAvailable && type === General.GM_CHANNEL && !isGuestUser;

    return (
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
                    callsEnabled={callsAvailable}
                    canManageMembers={canManageMembers}
                    isCRTEnabled={isCRTEnabled}
                    canManageSettings={canManageSettings}
                />
                <View style={styles.separator}/>
                {convertGMOptionAvailable &&
                <>
                    <ConvertToChannelLabel channelId={channelId}/>
                    <View style={styles.separator}/>
                </>
                }
                {canEnableDisableCalls &&
                    <>
                        <ChannelInfoEnableCalls
                            channelId={channelId}
                            enabled={isCallsEnabledInChannel}
                        />
                        <View style={styles.separator}/>
                    </>
                }
                <ChannelInfoAppBindings
                    channelId={channelId}
                    serverUrl={serverUrl}
                    dismissChannelInfo={onPressed}
                />
                <DestructiveOptions
                    channelId={channelId}
                    componentId={componentId}
                    type={type}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default ChannelInfo;
