// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {switchMap, of as of$} from 'rxjs';

import {withTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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
        ...typography('Body', 75, 'SemiBold'),
        color: theme.centerChannelColor,
        marginRight: 5,
    },
    teamContainer: {
        borderColor: theme.centerChannelColor,
        borderLeftWidth: StyleSheet.hairlineWidth,
    },
    team: {
        ...typography('Body', 75, 'Light'),
        color: theme.centerChannelColor,
        marginLeft: 5,
    },
}));

type Props = {
    channelName: ChannelModel['displayName'];
    post: PostModel;
    teamName: TeamModel['displayName'];
    theme: Theme;
}

function ChannelInfo({channelName, teamName, theme}: Props) {
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <Text style={styles.channel}>{channelName}</Text>
            {Boolean(teamName) && (
                <View style={styles.teamContainer}>
                    <Text style={styles.team}>{teamName}</Text>
                </View>
            )}
        </View>
    );
}

const enhance = withObservables(['post'], ({post}: {post: PostModel}) => {
    const channel = post.channel.observe();

    return {
        channelName: channel.pipe(
            switchMap((chan) => of$(chan.displayName)),
        ),
        teamName: channel.pipe(
            switchMap((chan) => chan.team || of$(null)),
            switchMap((team: TeamModel|null) => of$(team?.displayName || null)),
        ),
    };
});

export default compose(
    withTheme,
    enhance,
)(ChannelInfo);
