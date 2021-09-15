// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, TextStyle, View} from 'react-native';
import Animated, {AnimatedLayout, FadeInLeft, FadeInRight} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CustomStatus from './components/custom_status';
import UserPresence from './components/user_status';

import type Database from '@nozbe/watermelondb/Database';
import type {WithDatabaseArgs} from '@typings/database/database';
import type ServersModel from '@typings/database/models/app/servers';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {SYSTEM, USER}, APP: {SERVERS}} = MM_TABLES;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.sidebarBg,
        },
        body: {
            backgroundColor: theme.centerChannelBg,
            width: '100%',
            height: '60%',
            position: 'absolute',
            bottom: 0,
            borderTopRightRadius: 12,
            borderTopLeftRadius: 12,
            overflow: 'hidden',
        },
        logOutFrom: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            fontSize: 12,
            lineHeight: 16,
            fontFamily: 'OpenSans',
            fontWeight: 'normal',
            marginLeft: 50,
        },
        menuLabel: {
            color: theme.centerChannelColor,
            fontSize: 16,
            lineHeight: 24,
            fontFamily: 'OpenSans',
            fontWeight: '400',
        },
        animatedView: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        userInfo: {
            width: 300,
            height: 300,
        },
        upperBody: {
            width: '100%',
            height: '40%',
            top: 0,
            position: 'absolute',
            paddingTop: 52,
            paddingLeft: 20,
        },
        statusStyle: {
            right: 10,
            bottom: 10,
            borderColor: theme.sidebarBg,
            backgroundColor: theme.sidebarBg,
        },
        textFullName: {
            fontSize: 28,
            lineHeight: 36,
            color: '#FFFFFF',
            fontFamily: 'Metropolis-SemiBold',
            fontWeight: '600',
            marginTop: 16,
        },
        textUserName: {
            fontSize: 16,
            lineHeight: 24,
            color: '#FFFFFF',
            fontFamily: 'OpenSans',
            marginTop: 4,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
    };
});

type AccountScreenProps = {
    config: ClientConfig;
    currentUser: UserModel;
    database: Database;
};

const AccountScreen = ({config, currentUser, database}: AccountScreenProps) => {
    const theme = useTheme();
    const route = useRoute();
    const serverUrl = useServerUrl();
    const [serverName, setServerName] = useState('');
    const params = route.params! as { direction: string };
    const entering = params.direction === 'left' ? FadeInLeft : FadeInRight;

    const styles = getStyleSheet(theme);

    // To retrieve the server display name
    useEffect(() => {
        const getServerDisplayName = async () => {
            const appDatabase = DatabaseManager.appDatabase?.database;
            const servers = await appDatabase!.get(SERVERS).query().fetch() as unknown as ServersModel[];
            if (servers?.length > 0) {
                const curServer = servers.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a));
                setServerName(curServer.displayName);
            }
        };
        getServerDisplayName();
    }, []);

    //fixme: remove placeholder callback method
    const goToSavedMessages = () => {};

    const nickName = currentUser.nickname ? ` (${currentUser.nickname})` : '';
    const title = `${currentUser.firstName} ${currentUser.lastName}${nickName}`;
    const userName = `@${currentUser.username}`;

    const getLabelComponent = useCallback((id: string, defaultMessage: string, otherStyle?: TextStyle) => {
        return (
            <FormattedText
                id={t(id)}
                defaultMessage={defaultMessage}
                style={StyleSheet.flatten([styles.menuLabel, otherStyle])}
            />
        );
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <AnimatedLayout style={{flex: 1}}>
                <Animated.View
                    entering={entering.duration(150)}
                    style={styles.animatedView}
                >
                    <View
                        style={styles.upperBody}
                    >
                        <ProfilePicture
                            size={120}
                            iconSize={28}
                            showStatus={true}
                            author={currentUser}
                            testID={'account.profile_picture'}
                            statusStyle={styles.statusStyle}
                            statusSize={24}
                        />
                        <Text style={styles.textFullName}>{title}</Text>
                        <Text style={styles.textUserName}>{`${userName}`}</Text>
                    </View>
                    <View style={styles.body}>
                        <UserPresence
                            currentUser={currentUser}
                            database={database}
                            serverUrl={serverUrl}
                            styles={{menuLabel: styles.menuLabel}}
                            theme={theme}
                        />
                        <CustomStatus
                            config={config}
                            currentUser={currentUser}
                        />
                        <View style={styles.divider}/>
                        <DrawerItem
                            testID='account.your_profile.action'
                            labelComponent={getLabelComponent(t('account.your_profile'), 'Your Profile')}
                            iconName='account-outline'
                            onPress={goToSavedMessages}
                            separator={false}
                            theme={theme}
                        />
                        <DrawerItem
                            testID='account.saved_messages.action'
                            labelComponent={getLabelComponent(t('account.saved_messages'), 'Saved Messages')}
                            iconName='bookmark-outline'
                            onPress={goToSavedMessages}
                            separator={false}
                            theme={theme}
                        />
                        <DrawerItem
                            testID='account.settings.action'
                            labelComponent={getLabelComponent(t('account.settings'), 'Settings')}
                            iconName='settings-outline'
                            onPress={goToSavedMessages}
                            separator={true}
                            theme={theme}
                        />
                        <DrawerItem
                            testID='account.logout.action'
                            labelComponent={getLabelComponent(t('account.logout'), 'Log out', {color: theme.dndIndicator})}
                            iconName='exit-to-app'
                            isDestructor={true}
                            onPress={goToSavedMessages}
                            separator={false}
                            theme={theme}
                        />
                        <FormattedText
                            id={t('account.logout_from')}
                            defaultMessage={'Log out of {serverName}'} //fixme: construct server name
                            values={{serverName}}
                            style={styles.logOutFrom}
                        />
                    </View>
                </Animated.View>
            </AnimatedLayout>
        </SafeAreaView>
    );
};

const withUserConfig = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(switchMap((id: SystemModel) => database.get(USER).findAndObserve(id.value))),
    config: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap((cfg: SystemModel) => of$(cfg.value))),
}),
);

export default withDatabase(withUserConfig(AccountScreen));
