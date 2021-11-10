// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {switchMap, of as of$} from 'rxjs';

import {makeStyleSheetFromTheme} from '@utils/theme';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type TeamModel from '@typings/database/models/servers/team';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        marginLeft: 12,
        paddingVertical: 5,
    },
    channel: {
        marginRight: 5,
        fontFamily: 'OpenSans-Semibold',
        fontSize: 12,
        lineHeight: 16,
    },
    teamContainer: {
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderColor: theme.centerChannelColor,
    },
    team: {
        marginLeft: 5,
        fontFamily: 'OpenSans',
        fontSize: 12,
        lineHeight: 16,
    },
}));

type Props = {
    channel: ChannelModel;
    post: PostModel;
    team: TeamModel;
    theme: Theme;
}

function ChannelInfo({channel, team, theme}: Props) {
    const styles = getStyleSheet(theme);
    return (
        <View style={styles.container}>
            <Text style={styles.channel}>{channel.displayName}</Text>
            {Boolean(team) && (
                <View style={styles.teamContainer}>
                    <Text style={styles.team}>{team?.displayName}</Text>
                </View>
            )}
        </View>
    );
}

const enhance = withObservables(['post'], ({post}: {post: PostModel}) => ({
    channel: post.channel,
    team: post.channel.observe().pipe(
        switchMap((channel) => channel.team || of$(null)),
    ),
}));

export default enhance(ChannelInfo);
