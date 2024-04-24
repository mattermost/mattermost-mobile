// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform, Text, TouchableOpacity, View} from 'react-native';

import {useCurrentCall} from '@calls/state';
import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import ProfilePicture from '@components/profile_picture';
import Tag from '@components/tag';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {CallSession} from '@calls/types/calls';

const PROFILE_SIZE = 32;

type Props = {
    sess: CallSession;
    teammateNameDisplay: string;
    onPress: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    rowContainer: {
        flexDirection: 'row',
        paddingTop: 8,
        paddingBottom: 8,
        gap: 16,
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        flex: 1,
        gap: 8,
    },
    picture: {
        borderRadius: PROFILE_SIZE / 2,
        height: PROFILE_SIZE,
        width: PROFILE_SIZE,
    },
    name: {
        ...typography('Body', 200),
        color: theme.centerChannelColor,
        flex: 1,
    },
    you: {
        ...typography('Body', 200),
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    profileIcon: {
        color: changeOpacity(theme.buttonColor, 0.56),
    },
    icons: {
        flexDirection: 'row',
        gap: 16,
    },
    muteIcon: {
        color: changeOpacity(theme.centerChannelColor, 0.40),
    },
    unmutedIcon: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    hostTag: {
        paddingVertical: 4,
    },
    raiseHandIcon: {
        color: theme.awayIndicator,
    },
    screenSharingIcon: {
        color: theme.dndIndicator,
    },
}));

export const Participant = ({sess, teammateNameDisplay, onPress}: Props) => {
    const intl = useIntl();
    const currentCall = useCurrentCall();
    const theme = useTheme();

    const styles = getStyleSheet(theme);

    if (!currentCall) {
        return null;
    }

    return (
        <TouchableOpacity
            key={sess.sessionId}
            testID='users-list'
            style={styles.rowContainer}
            onPress={onPress}
        >
            {sess.userModel ? (
                <ProfilePicture
                    author={sess.userModel}
                    size={PROFILE_SIZE}
                    showStatus={false}
                    url={currentCall.serverUrl}
                />
            ) : (
                <CompassIcon
                    name='account-outline'
                    size={PROFILE_SIZE}
                    style={styles.profileIcon}
                />
            )}
            <View style={styles.row}>
                <Text
                    style={styles.name}
                    numberOfLines={1}
                >
                    {displayUsername(sess.userModel, intl.locale, teammateNameDisplay)}
                </Text>
                {sess.sessionId === currentCall.mySessionId &&
                    <Text style={styles.you}>
                        {intl.formatMessage({id: 'mobile.calls_you', defaultMessage: '(you)'})}
                    </Text>
                }
                {sess.userId === currentCall.hostId &&
                    <Tag
                        id={'mobile.calls_host'}
                        defaultMessage={'host'}
                        style={styles.hostTag}
                    />
                }
            </View>
            <View style={styles.icons}>
                {sess.reaction?.emoji !== undefined &&
                    <Emoji
                        emojiName={sess.reaction.emoji.name}
                        literal={sess.reaction.emoji.literal}
                        size={24 - Platform.select({ios: 3, default: 4})}
                    />
                }
                {sess.raisedHand !== 0 &&
                    <CompassIcon
                        name={'hand-right'}
                        size={24}
                        style={styles.raiseHandIcon}
                    />
                }
                {sess.sessionId === currentCall.screenOn &&
                    <CompassIcon
                        name={'monitor'}
                        size={24}
                        style={styles.screenSharingIcon}
                    />
                }
                <CompassIcon
                    name={sess.muted ? 'microphone-off' : 'microphone'}
                    size={24}
                    style={sess.muted ? styles.muteIcon : styles.unmutedIcon}
                />
            </View>
        </TouchableOpacity>
    );
};
