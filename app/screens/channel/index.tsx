// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import StatusBar from '@components/status_bar/status_bar';
import Preferences from '@constants/preferences';
import {Database, Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {parseTheme} from '@utils/general';
import {isMinimumServerVersion} from '@utils/helpers';
import {unsupportedServer} from '@utils/supported_server/supported_server';
import {makeStyleSheetFromTheme} from '@utils/theme';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {SafeAreaView} from 'react-native';

import {MM_TABLES} from '@constants/database';
import ViewTypes from '@constants/view';
import {isSystemAdmin as checkIsSystemAdmin} from '@utils/user';

import ChannelNavBar from './channel_nav_bar';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';
import type {LaunchType} from '@typings/launch';

import {ThemeProvider} from '@screens/channel/theme_provider';

const {SERVER: {CHANNEL, PREFERENCE, SYSTEM, USER}} = MM_TABLES;

const Channel = ({launchType, channelRecord: channel, themeRecords, userRecord: user, configRecord: config}: ChannelProps) => {
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
    //todo: Read Messages  - handleLeaveTeam, runTypingAnimations, handleRemovedFromChannel, clearChannelNotifications, registerTypingAnimation, runTypingAnimations, loadChannels??, showTermsOfServiceModal,

    //todo: Read Messages - renderLoadingOrFailedChannel, MainSideBar, SettingsSideBar

    const intl = useIntl();
    const theme = parseTheme(themeRecords[0].value);
    const styles = getStyleSheet(theme);

    useEffect(() => {
        //fixme: this should be this server.networkClient
        const serverVersion = (Client4.getServerVersion() || config.value?.Version) || '';
        const isSystemAdmin = checkIsSystemAdmin(user.roles);

        if (serverVersion) {
            const {RequiredServer: {MAJOR_VERSION, MIN_VERSION, PATCH_VERSION}} = ViewTypes;
            const isSupportedServer = isMinimumServerVersion(serverVersion, MAJOR_VERSION, MIN_VERSION, PATCH_VERSION);

            if (!isSupportedServer) {
            // Only display the Alert if the TOS does not need to show first
                unsupportedServer(isSystemAdmin, intl.formatMessage);
            }
        }
    }, [config.value?.Version, intl.formatMessage, user.roles]);

    return (
        <ThemeProvider value={theme}>
            <SafeAreaView style={styles.flex}>
                <StatusBar theme={theme}/>
                <ChannelNavBar
                    config={config}
                    channel={channel}
                    onPress={() => null}
                />
            </SafeAreaView>
        </ThemeProvider>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
        backgroundColor: 'green',
    },
}));

// TODO: Move as helper methods
type WithDatabaseArgs = { database: Database }
type WithChannelAndThemeArgs = WithDatabaseArgs & {
    currentChannelIdRecord: SystemModel,
    currentUserIdRecord: SystemModel,
}
type ChannelProps = WithDatabaseArgs & {
    channelRecord: ChannelModel;
    configRecord: SystemModel;
    launchType: LaunchType;
    themeRecords: PreferenceModel[];
    userRecord: UserModel;
};

export const withSystemIds = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentChannelIdRecord: database.collections.get(SYSTEM).findAndObserve('currentChannelId'),
    currentUserIdRecord: database.collections.get(SYSTEM).findAndObserve('currentUserId'),
    configRecord: database.collections.get(SYSTEM).findAndObserve('config'),
}));

const withChannelAndTheme = withObservables(['currentChannelIdRecord'], ({currentChannelIdRecord, currentUserIdRecord, database}: WithChannelAndThemeArgs) => {
    return {
        channelRecord: database.collections.get(CHANNEL).findAndObserve(currentChannelIdRecord.value),
        themeRecords: database.collections.get(PREFERENCE).query(Q.where('user_id', currentUserIdRecord.value), Q.where('category', 'theme')).observe(),
        userRecord: database.collections.get(USER).findAndObserve(currentUserIdRecord.value),
    };
});

export default withDatabase(withSystemIds(withChannelAndTheme(Channel)));
