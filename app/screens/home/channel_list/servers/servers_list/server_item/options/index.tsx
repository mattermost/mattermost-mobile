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

    const onEdit = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('ON EDIT');
    }, [server]);

    const onLogout = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('ON Logout');
    }, [server]);

    const onRemove = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('ON Remove');
    }, [server]);

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
            <Option
                color={theme.newMessageSeparator}
                icon='exit-to-app'
                onPress={onLogout}
                positionX={OPTION_SIZE}
                progress={progress}
                style={styles.right}
                text={intl.formatMessage({id: 'servers.logout', defaultMessage: 'Log out'})}
            />
        </View>
    );
};

export default ServerOptions;
