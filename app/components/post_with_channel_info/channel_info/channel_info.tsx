// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import TouchableWithFeedback from '@app/components/touchable_with_feedback';
import {useServerUrl} from '@app/context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type TeamModel from '@typings/database/models/servers/team';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
        paddingHorizontal: 8,
    },
    channel: {
        ...typography('Body', 75, 'SemiBold'),
        color: theme.centerChannelColor,
        marginRight: 5,
        flexShrink: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    teamContainer: {
        borderColor: theme.centerChannelColor,
        borderLeftWidth: StyleSheet.hairlineWidth,
        flexShrink: 1,
    },
    team: {
        ...typography('Body', 75, 'Light'),
        color: theme.centerChannelColor,
        marginLeft: 5,
    },
}));

type Props = {
    channelId: ChannelModel['id'];
    channelName: ChannelModel['displayName'];
    teamName: TeamModel['displayName'];
    testID?: string;
}

function ChannelInfo({channelId, channelName, teamName, testID}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const onChannelSwitch = useCallback(() => {
        switchToChannelById(serverUrl, channelId);
    }, [serverUrl]);

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            <TouchableWithFeedback
                onPress={onChannelSwitch}
                type={'native'}
                underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            >
                <Text
                    style={styles.channel}
                    testID='channel_display_name'
                    numberOfLines={1}
                >
                    {channelName}
                </Text>
            </TouchableWithFeedback>
            {Boolean(teamName) && (
                <View style={styles.teamContainer}>
                    <Text
                        style={styles.team}
                        testID='team_display_name'
                        numberOfLines={1}
                    >
                        {teamName}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default ChannelInfo;
