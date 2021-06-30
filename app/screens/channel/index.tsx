// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {Database, Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import ChannelModel from '@typings/database/models/servers/channel';
import {LaunchType} from '@typings/launch';
import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import ChannelNavBar from './channel_nav_bar';

const {SERVER: {CHANNEL, PREFERENCE, SYSTEM}} = MM_TABLES;

// params received as props for this screen
type ChannelInputProps = {
    channelId: string; // input
    launchType: LaunchType; // input
    database: Database;
}

type ChannelAugmentedProps = {
    channel: ChannelModel;
}

type ChannelProps = ChannelInputProps & ChannelAugmentedProps;

const Channel = ({launchType, channelId, channel, currentUserId, theme}: ChannelProps) => {
    // TODO: If we have LaunchProps, ensure we load the correct channel/post/modal.
    console.log('>>>>>>>>>>>>>>>>> launchType >>>>>>>> ', launchType); // eslint-disable-line no-console
    // TODO: If LaunchProps.error is true, use the LaunchProps.launchType to determine which
    // error message to display. For example:
    // if (props.launchError) {
    //     let erroMessage;
    //     if (props.launchType === LaunchType.DeepLink) {
    //         errorMessage = intl.formatMessage({id: 'mobile.launchError.deepLink', defaultMessage: 'Did not find a server for this deep link'});
    //     } else if (props.launchType === LaunchType.Notification) {
    //         errorMessage = intl.formatMessage({id: 'mobile.launchError.notification', defaultMessage: 'Did not find a server for this notification'});
    //     }
    // }

    //todo: Read Messages  - Do we need KeyboardLayout component ?
    //todo: Read Messages  - Implement goToChannelInfo

    return (
        <>
            <SafeAreaView style={styles.flex}>
                <View>
                    <Text>In channel screen </Text>
                </View>
                {/*<ChannelNavBar*/}
                {/*    channel={channel}*/}
                {/*    onPress={() => null}*/}
                {/*    theme={theme}*/}
                {/*/>*/}
            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const enhanceChannelAndUserId = withObservables(['channelId'], ({channelId = '123', database}) => ({
    channel: database.collections.get(CHANNEL).findAndObserve(channelId),
    currentUserId: database.collections.get(SYSTEM).query(Q.where('name', 'currentUserId')),
}));

const enhanceChannelPreference = withObservables(['currentUserId'], ({currentUserId, database}) => ({
    theme: database.collections.get(PREFERENCE).query(Q.where('user_id', currentUserId), Q.where('name', 'theme')),
}));

//fixme: remove hardcoded channel id
export default withDatabase(enhanceChannelAndUserId(enhanceChannelPreference(Channel)));

