// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {TextStyle, View} from 'react-native';

import {logout} from '@actions/remote/session';
import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import {useServerDisplayName, useServerUrl} from '@context/server';
import {alertServerLogout} from '@utils/server';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    style: TextStyle;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    label: {
        ...typography('Body', 200, 'Regular'),
        color: theme.dndIndicator,
    },
    logOutFrom: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75, 'Regular'),
    },
}));

const Settings = ({style, theme}: Props) => {
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const serverDisplayName = useServerDisplayName();

    const onLogout = useCallback(preventDoubleTap(() => {
        alertServerLogout(
            serverDisplayName,
            () => {
                logout(serverUrl);
            },
            intl,
        );
    }), [serverDisplayName, serverUrl, intl]);

    return (
        <MenuItem
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
                        values={{serverName: serverDisplayName}}
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
