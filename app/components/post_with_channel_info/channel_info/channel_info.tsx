// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type TeamModel from '@typings/database/models/servers/team';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        marginVertical: 8,
        paddingHorizontal: 16,
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
    teamName: TeamModel['displayName'];
    testID?: string;
}

function ChannelInfo({channelName, teamName, testID}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            <Text
                style={styles.channel}
                testID='channel_display_name'
            >
                {channelName}
            </Text>
            {Boolean(teamName) && (
                <View style={styles.teamContainer}>
                    <Text
                        style={styles.team}
                        testID='team_display_name'
                    >
                        {teamName}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default ChannelInfo;
