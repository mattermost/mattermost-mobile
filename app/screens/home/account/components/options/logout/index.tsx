// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Navigation} from 'react-native-navigation';

import {logout} from '@actions/remote/session';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useServerDisplayName, useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {alertServerLogout} from '@utils/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        desc: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
    };
});

const LogOut = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const serverDisplayName = useServerDisplayName();

    const onLogout = usePreventDoubleTap(useCallback(() => {
        Navigation.updateProps(Screens.HOME, {extra: undefined});
        alertServerLogout(serverDisplayName, () => logout(serverUrl, intl), intl);
    }, [serverDisplayName, serverUrl, intl]));

    return (
        <OptionItem
            action={onLogout}
            description={intl.formatMessage({id: 'account.logout_from', defaultMessage: 'Log out of {serverName}'}, {serverName: serverDisplayName})}
            destructive={true}
            icon='exit-to-app'
            label={intl.formatMessage({id: 'account.logout', defaultMessage: 'Log out'})}
            optionDescriptionTextStyle={styles.desc}
            testID='account.logout.option'
            type='default'
        />
    );
};

export default LogOut;
