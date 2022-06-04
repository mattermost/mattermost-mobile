// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import {General} from '@constants';

import DirectMessage from './direct_message';
import GroupMessage from './group_message';
import PublicPrivate from './public_private';

type Props = {
    channelId: string;
    displayName?: string;
    type?: ChannelType;
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        marginTop: 24,
    },
});

const Title = ({channelId, displayName, type}: Props) => {
    let component;
    switch (type) {
        case General.DM_CHANNEL:
            component = (
                <DirectMessage
                    channelId={channelId}
                    displayName={displayName}
                />
            );
            break;
        case General.GM_CHANNEL:
            component = (
                <GroupMessage
                    channelId={channelId}
                    displayName={displayName}
                />
            );
            break;
        default:
            component = (
                <PublicPrivate
                    channelId={channelId}
                    displayName={displayName}
                />

            );
            break;
    }

    return (
        <View style={styles.container}>
            {component}
        </View>
    );
};

export default Title;
