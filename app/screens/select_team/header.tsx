// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {logout} from '@actions/remote/session';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerDisplayName, useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {alertServerLogout} from '@utils/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        marginHorizontal: 24,
    },
    logoutText: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Body', 100, 'SemiBold'),
    },
    displayNameText: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Body', 100, 'SemiBold'),
        flex: 1,
    },
    logoutContainer: {
        marginLeft: 10,
    },
    displayNameContainer: {
        flex: 1,
    },
}));

function Header() {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverDisplayName = useServerDisplayName();
    const serverUrl = useServerUrl();

    const headerStyle = useMemo(() => styles.header, [styles.header]);
    const onLogoutPress = useCallback(() => {
        alertServerLogout(serverDisplayName, () => logout(serverUrl, intl), intl);
    }, [serverDisplayName, intl, serverUrl]);

    const serverLabel = (
        <Text
            style={styles.displayNameText}
            testID='select_team.server_display_name'
            numberOfLines={1}
        >
            {serverDisplayName}
        </Text>
    );

    return (
        <View style={headerStyle}>
            {serverLabel}
            <TouchableWithFeedback
                onPress={onLogoutPress}
                testID='select_team.logout.button'
                type='opacity'
                style={styles.logoutContainer}
            >
                <Text
                    style={styles.logoutText}
                    testID='select_team.logout.text'
                >
                    {intl.formatMessage({id: 'account.logout', defaultMessage: 'Log out'})}
                </Text>
            </TouchableWithFeedback>
        </View>
    );
}

export default Header;
