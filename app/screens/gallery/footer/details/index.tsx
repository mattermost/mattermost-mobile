// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {typography} from '@utils/typography';

type Props = {
    channelName: string;
    isDirectChannel: boolean;
    ownPost: boolean;
    userDisplayName: string;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        marginHorizontal: 12,
    },
    chanelText: {
        color: '#FFFFFF',
        ...typography('Body', 75),
        marginTop: 3,
        opacity: 0.56,
    },
    userText: {
        color: '#FFFFFF',
        ...typography('Body', 200, 'SemiBold'),
    },
});

const Details = ({channelName, isDirectChannel, ownPost, userDisplayName}: Props) => {
    const displayName = useMemo(() => ({displayName: userDisplayName}), [userDisplayName]);
    const channelDisplayName = useMemo(() =>
        ({channelName: `${isDirectChannel ? '@' : '~'}${channelName}`}),
    [channelName, isDirectChannel]);

    let userElement = (
        <Text
            ellipsizeMode='tail'
            numberOfLines={1}
            style={styles.userText}
        >
            {userDisplayName}
        </Text>
    );

    if (ownPost) {
        userElement = (
            <FormattedText
                id='channel_header.directchannel.you'
                defaultMessage='{displayName} (you)'
                ellipsizeMode='tail'
                numberOfLines={1}
                style={styles.userText}
                values={displayName}
            />
        );
    }

    return (
        <View style={styles.container}>
            {userElement}
            {Boolean(channelName) &&
            <FormattedText
                id='gallery.footer.channel_name'
                defaultMessage='Shared in {channelName}'
                ellipsizeMode='tail'
                numberOfLines={1}
                style={styles.chanelText}
                values={channelDisplayName}
            />
            }
        </View>
    );
};

export default Details;
