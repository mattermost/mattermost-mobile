// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {ScrollView, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import ChannelInfoEnableCalls from '@calls/components/channel_info_enable_calls';
import ConvertToChannelLabel from '@components/channel_actions/convert_to_channel/convert_to_channel_label';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Archive from './archive';
import ChannelAutotranslation from './channel_autotranslation';
import ConvertPrivate from './convert_private';
import EditChannel from './edit_channel';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    canArchive: boolean;
    canConvert: boolean;
    canEnableDisableCalls: boolean;
    canManageSettings: boolean;
    canUnarchive: boolean;
    channelId: string;
    closeButtonId?: string;
    componentId: AvailableScreens;
    convertGMOptionAvailable: boolean;
    displayName: string;
    isCallsEnabledInChannel: boolean;
    isChannelAutotranslateEnabled: boolean;
    type?: ChannelType;
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

const ChannelSettings = ({
    canArchive,
    canConvert,
    canEnableDisableCalls,
    canManageSettings,
    canUnarchive,
    channelId,
    closeButtonId,
    componentId,
    convertGMOptionAvailable,
    displayName,
    isCallsEnabledInChannel,
    isChannelAutotranslateEnabled,
    type,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const onPressed = useCallback(() => {
        return dismissModal({componentId});
    }, [componentId]);

    if (closeButtonId) {
        useNavButtonPressed(closeButtonId, componentId, onPressed, [onPressed]);
    }
    useAndroidHardwareBackHandler(componentId, onPressed);

    return (
        <View
            style={styles.flex}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <SafeAreaView
                edges={edges}
                style={styles.flex}
                testID='channel_settings.screen'
            >
                <ScrollView
                    bounces={true}
                    alwaysBounceVertical={false}
                    contentContainerStyle={styles.content}
                    testID='channel_settings.scroll_view'
                >
                    {canManageSettings &&
                        <EditChannel channelId={channelId}/>
                    }
                    {canConvert &&
                        <ConvertPrivate
                            canConvert={canConvert}
                            channelId={channelId}
                            displayName={displayName}
                        />
                    }
                    {canEnableDisableCalls &&
                        <ChannelInfoEnableCalls
                            channelId={channelId}
                            enabled={isCallsEnabledInChannel}
                        />
                    }
                    {convertGMOptionAvailable &&
                        <ConvertToChannelLabel channelId={channelId}/>
                    }
                    {canManageSettings && isChannelAutotranslateEnabled &&
                        <ChannelAutotranslation channelId={channelId}/>
                    }
                    {(canArchive || canUnarchive) &&
                        <>
                            <View style={styles.separator}/>
                            <Archive
                                canArchive={canArchive}
                                canUnarchive={canUnarchive}
                                channelId={channelId}
                                componentId={componentId}
                                type={type}
                            />
                        </>
                    }
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

export default ChannelSettings;

