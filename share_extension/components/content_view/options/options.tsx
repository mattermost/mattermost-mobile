// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import ErrorLabel from '@share/components/error/label';

import Option from './option';

type Props = {
    channelDisplayName?: string;
    hasChannels: boolean;
    serverDisplayName: string;
    theme: Theme;
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
    },
});

const Options = ({channelDisplayName, hasChannels, serverDisplayName, theme}: Props) => {
    const navigator = useNavigation<any>();
    const intl = useIntl();

    const serverLabel = useMemo(() => {
        return intl.formatMessage({
            id: 'share_extension.server_label',
            defaultMessage: 'Server',
        });
    }, [intl.locale]);

    const channelLabel = useMemo(() => {
        return intl.formatMessage({
            id: 'share_extension.channel_label',
            defaultMessage: 'Channel',
        });
    }, [intl.locale]);

    const errorLabel = useMemo(() => {
        return intl.formatMessage({
            id: 'share_extension.channel_error',
            defaultMessage: 'You are not a member of a team on the selected server. Select another server or open Mattermost to join a team.',
        });
    }, [intl.locale]);

    const onServerPress = useCallback(() => {
        navigator.navigate('Servers');
    }, []);

    const onChannelPress = useCallback(() => {
        navigator.navigate('Channels');
    }, []);

    let channel;
    if (hasChannels) {
        channel = (
            <Option
                label={channelLabel}
                value={channelDisplayName || ''}
                onPress={onChannelPress}
                theme={theme}
            />
        );
    } else {
        channel = (
            <ErrorLabel
                style={{marginHorizontal: 0}}
                text={errorLabel}
                theme={theme}
            />
        );
    }

    return (
        <View style={styles.container}>
            <Option
                label={serverLabel}
                value={serverDisplayName}
                onPress={onServerPress}
                theme={theme}
            />
            {channel}
        </View>
    );
};

export default Options;
