// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {ScrollView, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import ChannelInfoEnableCalls from '@calls/components/channel_info_enable_calls';
import ConvertToChannelLabel from '@components/channel_actions/convert_to_channel/convert_to_channel_label';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Archive from './archive';
import ChannelConfigurationOption from './channel_configuration_option';
import ChannelInfoOption from './channel_info';
import ConvertPrivate from './convert_private';

type Props = {
    canArchive: boolean;
    canConvert: boolean;
    canEnableDisableCalls: boolean;
    canManageSettings: boolean;
    canUnarchive: boolean;
    channelId: string;
    convertGMOptionAvailable: boolean;
    displayName: string;
    isCallsEnabledInChannel: boolean;
    canManageAutotranslations: boolean;
    canManageSharedChannel: boolean;
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
    convertGMOptionAvailable,
    displayName,
    isCallsEnabledInChannel,
    canManageAutotranslations,
    canManageSharedChannel,
    type,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const onPressed = useCallback(() => {
        return navigateBack();
    }, []);

    useAndroidHardwareBackHandler(Screens.CHANNEL_SETTINGS, onPressed);

    return (
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
                <ChannelInfoOption channelId={channelId}/>
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
                {(canManageAutotranslations || canManageSharedChannel) &&
                <ChannelConfigurationOption
                    channelId={channelId}
                    channelDisplayName={displayName}
                />
                }
                {(canArchive || canUnarchive) &&
                <>
                    <View style={styles.separator}/>
                    <Archive
                        canArchive={canArchive}
                        canUnarchive={canUnarchive}
                        channelId={channelId}
                        type={type}
                    />
                </>
                }
            </ScrollView>
        </SafeAreaView>
    );
};

export default ChannelSettings;

