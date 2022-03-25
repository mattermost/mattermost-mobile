// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, StyleSheet, Text, Platform} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';

type Props = {
    userId?: string;
    volume: number;
    muted?: boolean;
    sharingScreen?: boolean;
    raisedHand?: boolean;
    size?: 'm' | 'l';
}

const getStyleSheet = (props: Props) => {
    const baseSize = props.size === 'm' || !props.size ? 40 : 72;
    const smallIcon = props.size === 'm' || !props.size;
    const widthHeight = smallIcon ? 20 : 24;
    const borderRadius = smallIcon ? 10 : 12;
    const padding = smallIcon ? 1 : 2;

    return StyleSheet.create({
        pictureHalo: {
            backgroundColor: 'rgba(255,255,255,' + (0.16 * props.volume) + ')',
            height: baseSize + 16,
            width: baseSize + 16,
            padding: 4,
            marginRight: 4,
            borderRadius: (baseSize + 16) / 2,
        },
        pictureHalo2: {
            backgroundColor: 'rgba(255,255,255,' + (0.24 * props.volume) + ')',
            height: baseSize + 8,
            width: baseSize + 8,
            padding: 4,
            borderRadius: (baseSize + 8) / 2,
        },
        picture: {
            borderRadius: baseSize / 2,
            height: baseSize,
            width: baseSize,
        },
        mute: {
            position: 'absolute',
            bottom: -5,
            right: -5,
            width: widthHeight,
            height: widthHeight,
            borderRadius,
            padding,
            backgroundColor: props.muted ? 'black' : '#3DB887',
            borderColor: 'black',
            borderWidth: 2,
            color: 'white',
            textAlign: 'center',
            textAlignVertical: 'center',
            overflow: 'hidden',
        },
        raisedHand: {
            position: 'absolute',
            overflow: 'hidden',
            top: 0,
            right: -5,
            backgroundColor: 'black',
            borderColor: 'black',
            borderRadius,
            padding,
            borderWidth: 2,
            width: widthHeight,
            height: widthHeight,
            fontSize: smallIcon ? 10 : 12,
            ...Platform.select(
                {
                    android: {
                        padding: 4,
                        color: 'rgb(255, 188, 66)',
                    },
                },
            ),
        },
        screenSharing: {
            position: 'absolute',
            top: 0,
            right: -5,
            width: widthHeight,
            height: widthHeight,
            borderRadius,
            padding: padding + 1,
            backgroundColor: '#D24B4E',
            borderColor: 'black',
            borderWidth: 2,
            color: 'white',
            textAlign: 'center',
            textAlignVertical: 'center',
            overflow: 'hidden',
        },
    });
};

const CallAvatar = (props: Props) => {
    const style = getStyleSheet(props);
    const profileSize = props.size === 'm' || !props.size ? 40 : 72;
    const iconSize = props.size === 'm' || !props.size ? 12 : 16;

    // Only show one or the other.
    let topRightIcon: JSX.Element | null = null;
    if (props.sharingScreen) {
        topRightIcon = (
            <CompassIcon
                name={'monitor'}
                size={iconSize}
                style={style.screenSharing}
            />
        );
    } else if (props.raisedHand) {
        topRightIcon = (
            <Text style={style.raisedHand}>
                {'✋'}
            </Text>
        );
    }

    return (
        <View style={style.pictureHalo}>
            <View style={style.pictureHalo2}>
                <View style={style.picture}>
                    {
                        props.userId ?
                            <ProfilePicture
                                userId={props.userId}
                                size={profileSize}
                                showStatus={false}
                            /> :
                            <CompassIcon
                                name='account-outline'
                                size={profileSize}
                            />
                    }
                    {
                        props.muted !== undefined &&
                        <CompassIcon
                            name={props.muted ? 'microphone-off' : 'microphone'}
                            size={iconSize}
                            style={style.mute}
                        />
                    }
                    {topRightIcon}
                </View>
            </View>
        </View>
    );
};
export default CallAvatar;
