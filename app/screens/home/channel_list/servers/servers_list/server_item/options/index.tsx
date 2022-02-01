// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Animated, StyleSheet, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

import Option, {OPTION_SIZE} from './option';

import type ServersModel from '@typings/database/models/app/servers';

type Props = {
    progress: Animated.AnimatedInterpolation;
    server: ServersModel;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginLeft: 12,
        width: OPTION_SIZE * 3,
    },
    left: {borderTopLeftRadius: 8, borderBottomLeftRadius: 8},
    right: {borderTopRightRadius: 8, borderBottomRightRadius: 8},
});

const ServerOptions = ({progress, server}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isLoggedIn = server.lastActiveAt > 0;

    const onEdit = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('ON EDIT');
    }, [server]);

    const onLogin = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('ON Login');
    }, [server]);

    const onLogout = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('ON Logout');
    }, [server]);

    const onRemove = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('ON Remove');
    }, [server]);

    let sessionComponent;
    if (isLoggedIn) {
        sessionComponent = (
            <Option
                color='#F58B00'
                icon='logout-variant'
                onPress={onLogout}
                positionX={OPTION_SIZE}
                progress={progress}
                style={styles.right}
                text={intl.formatMessage({id: 'servers.logout', defaultMessage: 'Log out'})}
            />
        );
    } else {
        sessionComponent = (
            <Option
                color={theme.sidebarTextActiveBorder}
                icon='exit-to-app'
                onPress={onLogin}
                positionX={OPTION_SIZE}
                progress={progress}
                style={styles.right}
                text={intl.formatMessage({id: 'servers.login', defaultMessage: 'Log in'})}
            />
        );
    }

    return (
        <View style={styles.container}>
            <Option
                color={changeOpacity(theme.centerChannelColor, 0.48)}
                icon='pencil-outline'
                onPress={onEdit}
                positionX={OPTION_SIZE * 3}
                progress={progress}
                style={styles.left}
                text={intl.formatMessage({id: 'servers.edit', defaultMessage: 'Edit'})}
            />
            <Option
                color={theme.dndIndicator}
                icon='trash-can-outline'
                onPress={onRemove}
                positionX={OPTION_SIZE * 2}
                progress={progress}
                text={intl.formatMessage({id: 'servers.remove', defaultMessage: 'Remove'})}
            />
            {sessionComponent}
        </View>
    );
};

export default ServerOptions;
