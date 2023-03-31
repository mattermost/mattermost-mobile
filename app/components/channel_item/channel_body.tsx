// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {StyleProp, Text, TextStyle, View} from 'react-native';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CustomStatus from './custom_status';

type Props = {
    displayName: string;
    teamDisplayName: string;
    teammateId?: string;
    isMuted: boolean;
    textStyles: StyleProp<TextStyle>;
    testId: string;
    channelName: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        teamName: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        teamNameMuted: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
        flex: {
            flex: 0,
            flexShrink: 1,
        },
        channelName: {
            ...typography('Body', 200),
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        customStatus: {
            marginLeft: 4,
        },
    };
});
export const ChannelBody = ({
    displayName,
    channelName,
    teamDisplayName,
    teammateId,
    isMuted,
    textStyles,
    testId,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const isTablet = useIsTablet();
    const channelText = (
        <Text
            ellipsizeMode='tail'
            numberOfLines={1}
            style={[textStyles, styles.flex]}
            testID={`${testId}.display_name`}
        >
            {displayName.replace(' ', '\xa0')}
            {Boolean(channelName) && (
                <Text style={styles.channelName}>
                    {` ~${channelName}`}
                </Text>
            )}
        </Text>
    );

    if (teamDisplayName) {
        const teamText = (
            <Text
                ellipsizeMode='tail'
                numberOfLines={isTablet ? undefined : 1} // Handled by the parent text on tablets
                style={[styles.teamName, isMuted && styles.teamNameMuted, styles.flex]}
                testID={`${testId}.team_display_name`}
            >
                {` ${teamDisplayName}`}
            </Text>
        );

        if (isTablet) {
            return (
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={[textStyles, styles.flex]}
                    testID={`${testId}.display_name`}
                >
                    {displayName}
                    {teamText}
                </Text>
            );
        }

        return (
            <View style={styles.flex}>
                {channelText}
                {teamText}
            </View>
        );
    }

    if (teammateId) {
        const customStatus = (
            <CustomStatus
                userId={teammateId}
                style={styles.customStatus}
            />
        );
        return (
            <>
                {channelText}
                {customStatus}
            </>
        );
    }

    return channelText;
};
