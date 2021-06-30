// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {Database, Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables, {ObservableifyProps} from '@nozbe/with-observables';
import ChannelModel from '@typings/database/models/servers/channel';
import PreferenceModel from '@typings/database/models/servers/preference';
import SystemModel from '@typings/database/models/servers/system';
import {LaunchType} from '@typings/launch';
import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import ChannelNavBar from './channel_nav_bar';

const {SERVER: {CHANNEL, PREFERENCE, SYSTEM}} = MM_TABLES;

const Channel = ({launchType, channelId, channel, currentUserId, theme, database}: ChannelProps) => {
    // TODO: If we have LaunchProps, ensure we load the correct channel/post/modal.
    console.log('>>>>>>>>>>>>>>>>> launchType >>>>>>>> ', {
        launchType,

        // channelId,
        channel: channel.displayName,
        currentUserId: (currentUserId as SystemModel).value,
        // theme: JSON.parse(theme[0].value).centerChannelBg,

        // theme,
    }); // eslint-disable-line no-console

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

    const onPress = () => {
        database.action(async () => {
            // const userId = await database.collections.get(SYSTEM).query(Q.where('name', 'currentChanne')).fetch();
            // userId[0].update((m) => {
            //     m.value = 'Some config';
            // });
        });
    }

    return (
        <>
            <SafeAreaView style={styles.flex}>
                <View>
                    <Text onPress={onPress}>In channel screen </Text>
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

type ChannelAndUserIdObservableProps = {
    channelId: string;
    database: Database;
}

type ChannelPreferenceObservableProps = {
    currentUserId: string;
    database: Database;
}

type ChannelProps = {
    channel: ChannelModel;
    channelId: string;
    currentUserId: SystemModel;
    database: Database;
    launchType: LaunchType;
    theme: PreferenceModel;
};

// const enhanceChannelAndUserId = withObservables(['channelId'], ({channelId = '7hob1ggoypydubgje3y9fc15sr', database}: ChannelAndUserIdObservableProps) => ({
//     channel: database.collections.get(CHANNEL).findAndObserve(channelId),
//     currentUserId: database.collections.get(SYSTEM).query(Q.where('name', 'currentUserId')).observe(),
// }));

const enhanceChannel = withObservables(['currentChannelId'], ({currentChannelId, database}: ChannelAndUserIdObservableProps) => {
    return {
        channel: database.collections.get(CHANNEL).findAndObserve(currentChannelId.value),
    };
});

const enhanceChannelPreference = withObservables(['currentUserId'], ({currentUserId = 'p9g6rzz3kffhxqxhm1zckjpwda', database}: ChannelPreferenceObservableProps) => ({
    theme: database.collections.get(PREFERENCE).query(Q.where('user_id', 'p9g6rzz3kffhxqxhm1zckjpwda'), Q.where('category', 'theme')).observe(),
}));

const withCurrentUserId = withObservables([], ({database}) => ({
    currentUserId: database.collections.get(SYSTEM).findAndObserve('currentUserId'),
}));

const withCurrentChannelId = withObservables([], ({database}) => ({
    currentChannelId: database.collections.get(SYSTEM).findAndObserve('currentChannelId'),
}));

export default withDatabase(withCurrentUserId(withCurrentChannelId(enhanceChannel(Channel))));
