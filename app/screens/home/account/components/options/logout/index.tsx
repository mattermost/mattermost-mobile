// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Navigation} from 'react-native-navigation';

import {logout} from '@actions/remote/session';
import LocalConfig from '@assets/config.json';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useServerDisplayName, useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {alertServerLogout} from '@utils/server';

import {daakiaLogout} from '../../../../../../actions/remote/daakia_logout';

const LogOut = () => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const serverDisplayName = useServerDisplayName();

    const onLogout = usePreventDoubleTap(useCallback(() => {
        Navigation.updateProps(Screens.HOME, {extra: undefined});

        const logoutFunction = LocalConfig.AutoSelectServerUrl && LocalConfig.DefaultServerUrl ? () => daakiaLogout(serverUrl) : () => logout(serverUrl, intl);

        alertServerLogout(serverDisplayName, logoutFunction, intl);
    }, [serverDisplayName, serverUrl, intl]));

    return (
        <OptionItem
            action={onLogout}
            description={intl.formatMessage({id: 'account.logout_from', defaultMessage: 'Log out of {serverName}'}, {serverName: serverDisplayName})}
            destructive={true}
            icon='exit-to-app'
            label={intl.formatMessage({id: 'account.logout', defaultMessage: 'Log out'})}
            testID='account.logout.option'
            type='default'
            nonDestructiveDescription={true}
        />
    );
};

export default LogOut;
