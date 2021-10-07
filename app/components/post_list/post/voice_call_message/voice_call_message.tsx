// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, Alert, Pressable} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';

type VoiceCallMessageProps = {
    actions: {
        joinCall: (channelId: string) => void;
    };
    post: Post;
    user: UserProfile;
    theme: Theme;
    teammateNameDisplay: string;
    confirmToJoin: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        messageStyle: {
            flexDirection: 'row',
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 15,
            lineHeight: 20,
            paddingTop: 5,
            paddingBottom: 5,
        },
        messageText: {
            flex: 1,
        },
        joinCallIcon: {
            padding: 12,
            backgroundColor: '#339970',
            borderRadius: 8,
            marginRight: 5,
            color: 'white',
            overflow: 'hidden',
        },
        joinCallButtonText: {
            color: 'white',
        },
        joinCallButtonIcon: {
            color: 'white',
            marginRight: 5,
        },
        startedText: {
            fontWeight: 'bold',
        },
        joinCallButton: {
            flexDirection: 'row',
            padding: 12,
            backgroundColor: '#339970',
            borderRadius: 8,
            alignItems: 'center',
            alignContent: 'center',
        },
    };
});

const VoiceCallMessage = ({post, user, teammateNameDisplay, confirmToJoin, theme, actions}: VoiceCallMessageProps) => {
    const style = getStyleSheet(theme);
    const joinHandler = useCallback(() => {
        if (confirmToJoin) {
            // TODO: Translate it and add the channel names to the text
            Alert.alert(
                'Are you sure you want to switch to a different call?',
                'You are already on a channel call in ~TODO. Do you want to leave your current call and join the call in ~TODO',
                [
                    {
                        text: 'Cancel',
                    },
                    {
                        text: 'Leave & Join',
                        onPress: () => actions.joinCall(post.channel_id),
                        style: 'cancel',
                    },
                ],
            );
        } else {
            actions.joinCall(post.channel_id);
        }
    }, [post.channel_id, confirmToJoin]);
    return (
        <View style={style.messageStyle}>
            <CompassIcon
                name='phone-in-talk'
                size={16}
                style={style.joinCallIcon}
            />
            <View style={style.messageText}>
                <FormattedText
                    id='voice_call_message.started_a_call'
                    defaultMessage='{user} started a call'
                    values={{user: displayUsername(user, teammateNameDisplay)}}
                    style={style.startedText}
                />
                <FormattedRelativeTime
                    value={post.props.start_at}
                    updateIntervalInSeconds={1}
                />
            </View>
            <Pressable
                style={style.joinCallButton}
                onPress={joinHandler}
            >
                <CompassIcon
                    name='phone-outline'
                    size={16}
                    style={style.joinCallButtonIcon}
                />
                <FormattedText
                    id='voice_call_message.join_call'
                    defaultMessage='Join Call'
                    style={style.joinCallButtonText}
                />
            </Pressable>
        </View>
    );
};

export default VoiceCallMessage;
