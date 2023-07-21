// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View, StyleSheet, Platform} from 'react-native';

import {makeCallsTheme} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

import type {CallsTheme} from '@calls/types/calls';
import type {EmojiData} from '@mattermost/calls/lib/types';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    userModel?: UserModel;
    volume: number;
    serverUrl: string;
    size: number;
    muted?: boolean;
    sharingScreen?: boolean;
    raisedHand?: boolean;
    reaction?: EmojiData;
}

// Note: microSize is 32, smallSize is 72
const mediumSize = 96;

const getStyleSheet = ({
    theme,
    volume,
    size,
}: { theme: CallsTheme; volume: number; size: number }) => {
    // Note: we are using the same mute/reaction sizes for small and medium sizes
    const mediumIcon = size <= mediumSize;
    const muteWidthHeight = mediumIcon ? 28 : 36;
    const muteBorderRadius = mediumIcon ? 14 : 18;
    const reactWidthHeight = mediumIcon ? 32 : 40;
    const reactBorderRadius = mediumIcon ? 16 : 20;

    return StyleSheet.create({
        pictureHalo: {
            backgroundColor: changeOpacity(theme.onlineIndicator, 0.24 * volume),
            height: size + 16,
            width: size + 16,
            padding: 4,
            borderRadius: (size + 16) / 2,
        },
        pictureHalo2: {
            backgroundColor: changeOpacity(theme.onlineIndicator, 0.32 * volume),
            height: size + 8,
            width: size + 8,
            padding: 3,
            borderRadius: (size + 8) / 2,
        },
        picture: {
            borderRadius: size / 2,
            height: size,
            width: size,
            marginBottom: 5,
        },
        profileIcon: {
            color: changeOpacity(theme.buttonColor, 0.16),
        },
        voiceShadow: {
            shadowColor: 'rgb(61, 184, 135)',
            shadowOffset: {width: 0, height: 0},
            shadowOpacity: 1,
            shadowRadius: 10,
        },
        muteIconContainer: {
            position: 'absolute',
            bottom: 0,
            right: -5,
            width: muteWidthHeight,
            height: muteWidthHeight,
            borderRadius: muteBorderRadius,
            backgroundColor: theme.callsBg,
        },
        muteIcon: {
            width: muteWidthHeight,
            height: muteWidthHeight,
            borderRadius: muteBorderRadius,
            paddingTop: 6,
            backgroundColor: changeOpacity(theme.buttonColor, 0.16),
            color: theme.buttonColor,
            textAlign: 'center',
            textAlignVertical: 'center',
            overflow: 'hidden',
            ...Platform.select(
                {
                    ios: {
                        padding: 2,
                    },
                },
            ),
        },
        muteIconUnmuted: {
            backgroundColor: theme.onlineIndicator,
        },
        reactionContainer: {
            position: 'absolute',
            top: -5,
            right: -8,
            width: reactWidthHeight,
            height: reactWidthHeight,
            borderRadius: reactBorderRadius,
            backgroundColor: theme.callsBg,
        },
        reaction: {
            width: reactWidthHeight,
            height: reactWidthHeight,
            borderRadius: reactBorderRadius,
            textAlign: 'center',
            textAlignVertical: 'center',
            backgroundColor: changeOpacity(theme.buttonColor, 0.16),
            overflow: 'hidden',
        },
        raisedHand: {
            backgroundColor: theme.buttonColor,
            color: theme.awayIndicator,
            ...Platform.select(
                {
                    ios: {
                        paddingRight: 1,
                        paddingTop: 5,
                    },
                    default: {
                        paddingLeft: 0,
                        paddingTop: 0,
                    },
                },
            ),
        },
        screenSharing: {
            backgroundColor: theme.dndIndicator,
            color: theme.buttonColor,
            textAlign: 'center',
            textAlignVertical: 'center',
            paddingTop: Platform.select({ios: 5}),
        },
        emoji: {
            paddingLeft: Platform.select({ios: 5, default: 5}),
            paddingTop: Platform.select({ios: 7, default: 3}),
        },
    });
};

const CallAvatar = ({userModel, volume, serverUrl, sharingScreen, size, muted, raisedHand, reaction}: Props) => {
    const theme = useTheme();
    const callsTheme = useMemo(() => makeCallsTheme(theme), [theme]);
    const style = useMemo(() => getStyleSheet({theme: callsTheme, volume, size}), [callsTheme, volume, size]);

    const iconSize = size <= mediumSize ? 18 : 24;
    const reactionSize = size <= mediumSize ? 22 : 26;
    const styleShadow = volume > 0 ? style.voiceShadow : undefined;

    // Only show one or the other.
    let topRightIcon: JSX.Element | null = null;
    if (sharingScreen) {
        topRightIcon = (
            <View style={style.reactionContainer}>
                <CompassIcon
                    name={'monitor'}
                    size={reactionSize}
                    style={[style.reaction, style.screenSharing]}
                />
            </View>
        );
    } else if (raisedHand) {
        topRightIcon = (
            <View style={style.reactionContainer}>
                <CompassIcon
                    name={'hand-right'}
                    size={reactionSize}
                    style={[style.reaction, style.raisedHand]}
                />
            </View>
        );
    }

    // An emoji will override the top right indicator.
    if (reaction) {
        topRightIcon = (
            <View style={style.reactionContainer}>
                <View style={[style.reaction, style.emoji]}>
                    <Emoji
                        emojiName={reaction.name}
                        literal={reaction.literal}
                        size={reactionSize - Platform.select({ios: 6, default: 4})}
                    />
                </View>
            </View>
        );
    }

    const profile = userModel ? (
        <ProfilePicture
            author={userModel}
            size={size}
            showStatus={false}
            url={serverUrl}
        />
    ) : (
        <CompassIcon
            name='account-outline'
            size={size}
            style={style.profileIcon}
        />
    );

    const view = (
        <View style={[style.picture, styleShadow]}>
            {profile}
            {
                muted !== undefined &&
                <View style={style.muteIconContainer}>
                    <CompassIcon
                        name={muted ? 'microphone-off' : 'microphone'}
                        size={iconSize}
                        style={[style.muteIcon, !muted && style.muteIconUnmuted]}
                    />
                </View>
            }
            {topRightIcon}
        </View>
    );

    if (Platform.OS === 'android') {
        return (
            <View style={style.pictureHalo}>
                <View style={style.pictureHalo2}>
                    {view}
                </View>
            </View>
        );
    }

    return view;
};

export default CallAvatar;
