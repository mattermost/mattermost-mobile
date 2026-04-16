// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';
import {mergeNavigationOptions} from '@utils/navigation';
import {changeOpacity} from '@utils/theme';

import ChannelAutotranslation from './channel_autotranslation';
import ShareWithConnectedWorkspaces from './share_with_connected_workspaces';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    canManageAutotranslations: boolean;
    canManageSharedChannel: boolean;
    channelId: string;
    componentId: AvailableScreens;
    displayName: string;
    isChannelShared: boolean;
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    flex: {
        flex: 1,
    },
});

const ChannelConfiguration = ({
    canManageAutotranslations,
    canManageSharedChannel,
    channelId,
    componentId,
    displayName,
    isChannelShared,
}: Props) => {
    const theme = useTheme();

    const onPressed = useCallback(() => {
        return popTopScreen(componentId);
    }, [componentId]);

    useEffect(() => {
        mergeNavigationOptions(componentId, {
            topBar: {
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: displayName,
                },
            },
        });
    }, [componentId, displayName, theme.sidebarHeaderTextColor]);

    useAndroidHardwareBackHandler(componentId, onPressed);

    return (
        <View
            style={styles.flex}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <SafeAreaView
                edges={edges}
                style={styles.flex}
                testID='channel_configuration.screen'
            >
                <ScrollView
                    bounces={true}
                    alwaysBounceVertical={false}
                    contentContainerStyle={styles.content}
                    testID='channel_configuration.scroll_view'
                >
                    {canManageAutotranslations &&
                        <ChannelAutotranslation channelId={channelId}/>
                    }
                    {canManageSharedChannel &&
                        <ShareWithConnectedWorkspaces
                            channelId={channelId}
                            isChannelShared={isChannelShared}
                            channelDisplayName={displayName}
                        />
                    }
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

export default ChannelConfiguration;
