// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {Database, Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import ChannelModel from '@typings/database/models/servers/channel';
import PreferenceModel from '@typings/database/models/servers/preference';
import SystemModel from '@typings/database/models/servers/system';
import {LaunchType} from '@typings/launch';
import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import ChannelNavBar from './channel_nav_bar';

const {SERVER: {CHANNEL, PREFERENCE, SYSTEM}} = MM_TABLES;

const Channel = ({launchType, currentChannelIdRecord, channelRecord: channel, currentUserIdRecord, themeRecords, database}: ChannelProps) => {
    // TODO: If we have LaunchProps, ensure we load the correct channel/post/modal.
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
    //todo: Create a ThemeProvider that uses Preferences/theme as starting value and default it to the appearance light/dark mode

    const currentChannelId = currentChannelIdRecord.value;
    const currentUserId = (currentUserIdRecord as SystemModel).value;
    const theme = themeRecords[0].value;

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

// TODO: Move as helper methods
type WithDatabaseArgs = { database: Database }
type WithChannelAndThemeArgs = WithDatabaseArgs & {currentChannelIdRecord: SystemModel, currentUserIdRecord: SystemModel}
type ChannelProps = WithDatabaseArgs & {
    channelRecord: ChannelModel;
    currentChannelIdRecord: SystemModel;
    currentUserIdRecord: SystemModel;
    launchType: LaunchType;
    themeRecords: PreferenceModel[];
};

export const withSystemIds = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentChannelIdRecord: database.collections.get(SYSTEM).findAndObserve('currentChannelId'),
    currentUserIdRecord: database.collections.get(SYSTEM).findAndObserve('currentUserId'),
}));

const withChannelAndTheme = withObservables(['currentChannelIdRecord'], ({currentChannelIdRecord, currentUserIdRecord, database}: WithChannelAndThemeArgs) => {
    return {
        channelRecord: database.collections.get(CHANNEL).findAndObserve(currentChannelIdRecord.value),
        themeRecords: database.collections.get(PREFERENCE).query(Q.where('user_id', currentUserIdRecord.value), Q.where('category', 'theme')).observe(),
    };
});

export default withDatabase(withSystemIds(withChannelAndTheme(Channel)));
