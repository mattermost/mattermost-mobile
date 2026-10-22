// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, StyleSheet} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useFetchRenderPermissions} from '@hooks/render_permissions';
import ReadOnlyNotice from '@screens/channel_settings/read_only_notice';
import {navigateBack} from '@screens/navigation';

import ChannelAutotranslation from './channel_autotranslation';
import ShareWithConnectedWorkspaces from './share_with_connected_workspaces';

type Props = {
    canManageAutotranslations: boolean;
    canManageSharedChannel: boolean;
    channelId: string;
    displayName: string;
    isChannelShared: boolean;
    isReadOnly: boolean;
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
    displayName,
    isChannelShared,
    isReadOnly,
}: Props) => {
    const navigation = useNavigation();
    const intl = useIntl();

    const onPressed = useCallback(() => {
        navigateBack();
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({id: 'channel_settings.configuration', defaultMessage: 'Configuration'})}
                    subtitle={displayName}
                />
            ),
        });
    }, [displayName, intl, navigation]);

    useAndroidHardwareBackHandler(Screens.CHANNEL_CONFIGURATION, onPressed);
    useFetchRenderPermissions(channelId);

    return (
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
                {isReadOnly &&
                    <ReadOnlyNotice
                        location={Screens.CHANNEL_CONFIGURATION}
                        testID='channel_configuration.read_only_notice'
                    />
                }
                {canManageAutotranslations &&
                    <ChannelAutotranslation
                        channelId={channelId}
                        disabled={isReadOnly}
                    />
                }
                {canManageSharedChannel &&
                    <ShareWithConnectedWorkspaces
                        channelId={channelId}
                        isChannelShared={isChannelShared}
                        channelDisplayName={displayName}
                        disabled={isReadOnly}
                    />
                }
            </ScrollView>
        </SafeAreaView>
    );
};

export default ChannelConfiguration;
