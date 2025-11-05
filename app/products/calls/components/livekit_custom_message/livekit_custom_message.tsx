// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Linking, Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    post: PostModel;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        title: {
            ...typography('Heading', 300),
            color: theme.centerChannelColor,
        },
        messageStyle: {
            flexDirection: 'row',
            alignItems: 'center',
            color: changeOpacity(theme.centerChannelColor, 0.6),
            padding: 12,
            marginBottom: 2,
            gap: 8,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderRadius: 4,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {width: 0, height: 2},
            shadowRadius: 1,
            shadowOpacity: 0.08,
            elevation: 1,
        },
        message: {
            flex: 1,
        },
        text: {
            color: theme.centerChannelColor,
            ...typography('Heading', 200),
        },
        timeText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 75),
        },
        callIcon: {
            padding: 10,
            borderRadius: 20,
            color: theme.buttonColor,
            overflow: 'hidden',
        },
        joinIcon: {
            backgroundColor: theme.buttonBg,
        },
        callButton: {
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 7,
            borderRadius: 4,
            alignItems: 'center',
            alignContent: 'center',
            backgroundColor: theme.buttonBg,
        },
        buttonText: {
            color: theme.buttonColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        buttonIcon: {
            color: theme.buttonColor,
        },
    };
});

const LivekitCustomMessage = ({post}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const topic = (post.props?.topic || post.message) as string | undefined;
    const meetingUrl = post.props?.meeting_url as string | undefined;
    const startedAt = post.createAt;

    const onJoin = useCallback(() => {
        if (meetingUrl) {
            Linking.openURL(meetingUrl).catch(() => {
                // Error opening URL - silently fail
            });
        }
    }, [meetingUrl]);

    return (
        <>
            <View style={style.messageStyle}>
                <CompassIcon
                    name='phone-in-talk'
                    size={20}
                    style={[style.callIcon, style.joinIcon]}
                />
                <View style={style.message}>
                    {topic && (
                        <Text style={style.title}>
                            {String(topic)}
                        </Text>
                    )}
                    <FormattedText
                        id={'mobile.livekit_started_call'}
                        defaultMessage={'Started call'}
                        style={style.text}
                    />
                    <FormattedRelativeTime
                        value={startedAt}
                        updateIntervalInSeconds={1}
                        style={style.timeText}
                    />
                </View>
                {Boolean(meetingUrl) && (
                    <TouchableOpacity
                        style={style.callButton}
                        onPress={onJoin}
                    >
                        <CompassIcon
                            name='phone-in-talk'
                            size={18}
                            style={style.buttonIcon}
                        />
                        <FormattedText
                            id={'mobile.livekit_join'}
                            defaultMessage={'Join'}
                            style={style.buttonText}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </>
    );
};

export default LivekitCustomMessage;

