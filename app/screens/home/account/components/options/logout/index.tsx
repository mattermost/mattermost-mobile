// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {TextStyle, View} from 'react-native';

import {logout} from '@actions/remote/session';
import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {queryServer} from '@queries/app/servers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    style: TextStyle;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    label: {
        color: theme.dndIndicator,
        marginTop: 5,
    },
    logOutFrom: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        fontSize: 12,
        height: 30,
        lineHeight: 16,
        fontFamily: 'OpenSans',
    },
}));

const Settings = ({style, theme}: Props) => {
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const [serverName, setServerName] = useState(serverUrl);
    const onLogout = useCallback(preventDoubleTap(() => {
        logout(serverUrl);
    }), []);

    useEffect(() => {
        const appDatabase = DatabaseManager.appDatabase?.database;
        if (appDatabase) {
            queryServer(appDatabase, serverUrl).then((server) => {
                if (server) {
                    setServerName(server.displayName);
                }
            });
        }
    }, [serverUrl]);

    return (
        <DrawerItem
            testID='account.logout.action'
            labelComponent={(
                <View>
                    <FormattedText
                        id='account.logout'
                        defaultMessage='Log out'
                        style={[style, styles.label]}
                    />
                    <FormattedText
                        id={'account.logout_from'}
                        defaultMessage={'Log out of {serverName}'}
                        values={{serverName}}
                        style={styles.logOutFrom}
                    />
                </View>
            )}
            iconName='exit-to-app'
            isDestructor={true}
            onPress={onLogout}
            separator={false}
            theme={theme}
        />
    );
};

export default Settings;
