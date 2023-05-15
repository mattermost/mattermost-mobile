// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server';
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
    channelContainer: {
        borderRadius: 4,
        overflow: 'hidden',
    },
    channel: {
        ...typography('Body', 75, 'SemiBold'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
        flexShrink: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    teamContainer: {
        borderColor: theme.centerChannelColor,
        flexShrink: 1,
    },
    team: {
        ...typography('Body', 75, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
        marginLeft: 8,
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

    const [isPressed, setIsPressed] = useState<Boolean>(false);

    const channelNameStyle = useMemo(() => (
        [styles.channel, isPressed ? {color: theme.buttonBg} : null]
    ), [isPressed, styles, theme]);

    const teamContainerStyle = useMemo(() => (
        [styles.teamContainer, isPressed ? null : {borderLeftWidth: StyleSheet.hairlineWidth}]
    ), [isPressed, styles]);

    const onChannelNamePressed = useCallback(() => {
        if (channelId) {
            switchToChannelById(serverUrl, channelId);
        }
    }, [serverUrl, channelId]);

    const togglePressed = useCallback(() => {
        setIsPressed((prevState) => !prevState);
    }, []);

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            <View style={styles.channelContainer}>
                <TouchableWithFeedback
                    onPress={onChannelNamePressed}
                    type={'native'}
                    underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                    onPressIn={togglePressed}
                    onPressOut={togglePressed}
                >
                    <Text
                        style={channelNameStyle}
                        testID='channel_display_name'
                        numberOfLines={1}
                    >
                        {channelName}
                    </Text>
                </TouchableWithFeedback>
            </View>
            {Boolean(teamName) && (
                <View style={teamContainerStyle}>
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
