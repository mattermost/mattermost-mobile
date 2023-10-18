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
    speaking?: boolean;
    serverUrl: string;
    size: number;
    muted?: boolean;
    sharingScreen?: boolean;
    raisedHand?: boolean;
    reaction?: EmojiData;
}

// Note: microSize is 32, smallSize is 72
const mediumSize = 72;
const mediumBorderWidth = 3;
const largeBorderWidth = 6;

const getStyleSheet = ({theme, size}: { theme: CallsTheme; size: number }) => {
    // Note: we are using the same mute/reaction sizes for small and medium sizes
    const mediumIcon = size <= mediumSize;
    const muteWidthHeight = mediumIcon ? 28 : 36;
    const muteBorderRadius = mediumIcon ? 14 : 18;
    const reactWidthHeight = mediumIcon ? 32 : 40;
    const reactBorderRadius = mediumIcon ? 16 : 20;
    const borderWidth = size <= mediumSize ? mediumBorderWidth : largeBorderWidth;

    return StyleSheet.create({
        pictureContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            height: size + (borderWidth * 4),
            width: size + (borderWidth * 4),
        },
        pictureHalo: {
            backgroundColor: changeOpacity(theme.onlineIndicator, 0.24),
            height: size + (borderWidth * 4),
            width: size + (borderWidth * 4),
            padding: borderWidth,
            borderRadius: (size + (borderWidth * 4)) / 2,
        },
        pictureHalo2: {
            backgroundColor: changeOpacity(theme.onlineIndicator, 0.32),
            height: size + (borderWidth * 2),
            width: size + (borderWidth * 2),
            padding: borderWidth,
            borderRadius: (size + (borderWidth * 4)) / 2,
        },
        picture: {
            borderRadius: size / 2,
            height: size,
            width: size,
        },
        profileIcon: {
            color: changeOpacity(theme.buttonColor, 0.56),
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
            paddingLeft: Platform.select({ios: mediumIcon ? 4 : 6, default: 5}),
            paddingTop: Platform.select({ios: 5, default: 3}),
        },
    });
};

const CallAvatar = ({
    userModel,
    speaking = false,
    serverUrl,
    sharingScreen,
    size,
    muted,
    raisedHand,
    reaction,
}: Props) => {
    const theme = useTheme();
    const callsTheme = useMemo(() => makeCallsTheme(theme), [theme]);
    const style = useMemo(() => getStyleSheet({theme: callsTheme, size}), [callsTheme, size]);

    const iconSize = size <= mediumSize ? 18 : 24;
    const reactionSize = size <= mediumSize ? 22 : 28;

    // Only show one or the other.
    let topRightIcon: React.JSX.Element | null = null;
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
                        size={reactionSize - Platform.select({ios: 3, default: 4})}
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

    return (
        <View style={style.pictureContainer}>
            <View style={[speaking && style.pictureHalo]}>
                <View style={[speaking && style.pictureHalo2]}>
                    <View style={[style.picture]}>
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
                </View>
            </View>
        </View>
    );
};

export default CallAvatar;
