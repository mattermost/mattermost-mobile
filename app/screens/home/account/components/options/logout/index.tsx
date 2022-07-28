// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {logout} from '@actions/remote/session';
import OptionItem from '@components/option_item';
import {useServerDisplayName, useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {alertServerLogout} from '@utils/server';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        spacer: {
            marginLeft: 16, //fixme: 'remove this when we have a better way to handle this',
            marginTop: 16,
        },
        desc: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
    };
});

const Settings = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const serverDisplayName = useServerDisplayName();

    const onLogout = useCallback(preventDoubleTap(() => {
        alertServerLogout(serverDisplayName, () => logout(serverUrl), intl);
    }), [serverDisplayName, serverUrl, intl]);

    return (
        <OptionItem
            action={onLogout}
            containerStyle={styles.spacer} // fixme: perhaps we have space at the parent level
            description={intl.formatMessage({id: 'account.logout_from', defaultMessage: 'Log out from'}, {serverName: serverDisplayName})}
            destructive={true}
            icon='exit-to-app'
            label={intl.formatMessage({id: 'account.logout', defaultMessage: 'Log out'})}
            optionDescriptionTextStyle={styles.desc}
            testID='account.logout.action'
            type='default'
        />
    );
};

export default Settings;
