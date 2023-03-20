// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View, StyleSheet, Text, Platform} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import ProfilePicture from '@components/profile_picture';

import type {EmojiData} from '@mattermost/calls/lib/types';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    userModel?: UserModel;
    volume: number;
    serverUrl: string;
    muted?: boolean;
    sharingScreen?: boolean;
    raisedHand?: boolean;
    reaction?: EmojiData;
    size?: 'm' | 'l';
}

const getStyleSheet = ({volume, muted, size}: { volume: number; muted?: boolean; size?: 'm' | 'l' }) => {
    const baseSize = size === 'm' || !size ? 40 : 72;
    const smallIcon = size === 'm' || !size;
    const widthHeight = smallIcon ? 20 : 24;
    const borderRadius = smallIcon ? 10 : 12;
    const padding = smallIcon ? 1 : 2;

    return StyleSheet.create({
        pictureHalo: {
            backgroundColor: 'rgba(61, 184, 135,' + (0.24 * volume) + ')',
            height: baseSize + 16,
            width: baseSize + 16,
            padding: 4,
            marginRight: 4,
            borderRadius: (baseSize + 16) / 2,
        },
        pictureHalo2: {
            backgroundColor: 'rgba(61, 184, 135,' + (0.32 * volume) + ')',
            height: baseSize + 8,
            width: baseSize + 8,
            padding: 3,
            borderRadius: (baseSize + 8) / 2,
        },
        picture: {
            borderRadius: baseSize / 2,
            height: baseSize,
            width: baseSize,
            marginBottom: 5,
        },
        voiceShadow: {
            shadowColor: 'rgb(61, 184, 135)',
            shadowOffset: {width: 0, height: 0},
            shadowOpacity: 1,
            shadowRadius: 10,
        },
        mute: {
            position: 'absolute',
            bottom: -5,
            right: -5,
            width: widthHeight,
            height: widthHeight,
            borderRadius,
            padding,
            backgroundColor: muted ? 'black' : '#3DB887',
            borderColor: 'black',
            borderWidth: 2,
            color: 'white',
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
        reaction: {
            position: 'absolute',
            overflow: 'hidden',
            top: 0,
            right: -5,
            width: widthHeight,
            height: widthHeight,
            borderRadius,
            padding,
            backgroundColor: 'black',
            borderColor: 'black',
            borderWidth: 2,
            fontSize: smallIcon ? 10 : 12,
        },
        raisedHand: {
            backgroundColor: 'white',
            right: -5,
            ...Platform.select(
                {
                    android: {
                        paddingLeft: 5,
                        paddingTop: 3,
                        color: 'rgb(255, 188, 66)',
                    },
                },
            ),
        },
        screenSharing: {
            padding: padding + 1,
            backgroundColor: '#D24B4E',
            color: 'white',
            textAlign: 'center',
            textAlignVertical: 'center',
            paddingTop: Platform.select({ios: 3}),
        },
        emoji: {
            paddingLeft: 1,
            paddingTop: Platform.select({ios: 2, default: 1}),
        },
    });
};

const CallAvatar = ({userModel, volume, serverUrl, sharingScreen, size, muted, raisedHand, reaction}: Props) => {
    const style = useMemo(() => getStyleSheet({volume, muted, size}), [volume, muted, size]);
    const profileSize = size === 'm' || !size ? 40 : 72;
    const iconSize = size === 'm' || !size ? 12 : 16;
    const styleShadow = volume > 0 ? style.voiceShadow : undefined;

    // Only show one or the other.
    let topRightIcon: JSX.Element | null = null;
    if (sharingScreen) {
        topRightIcon = (
            <CompassIcon
                name={'monitor'}
                size={iconSize}
                style={[style.reaction, style.screenSharing]}
            />
        );
    } else if (raisedHand) {
        topRightIcon = (
            <Text style={[style.reaction, style.raisedHand]}>
                {'✋'}
            </Text>
        );
    }

    // An emoji will override the top right indicator.
    if (reaction) {
        topRightIcon = (
            <View style={[style.reaction, style.emoji]}>
                <Emoji
                    emojiName={reaction.name}
                    literal={reaction.literal}
                    size={iconSize - 3}
                />
            </View>
        );
    }

    const profile = userModel ? (
        <ProfilePicture
            author={userModel}
            size={profileSize}
            showStatus={false}
            url={serverUrl}
        />
    ) : (
        <CompassIcon
            name='account-outline'
            size={profileSize}
        />
    );

    const view = (
        <View style={[style.picture, styleShadow]}>
            {profile}
            {
                muted !== undefined &&
                <CompassIcon
                    name={muted ? 'microphone-off' : 'microphone'}
                    size={iconSize}
                    style={style.mute}
                />
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
