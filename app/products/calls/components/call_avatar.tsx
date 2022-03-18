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
    raisedHand?: boolean;
    size?: 'm' | 'l';
}

const getStyleSheet = (props: Props) => {
    const baseSize = props.size === 'm' || !props.size ? 40 : 72;

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
            width: 24,
            height: 24,
            borderRadius: 12,
            padding: 2,
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
            borderRadius: 12,
            padding: 2,
            borderWidth: 2,
            width: 24,
            height: 24,
            fontSize: 12,
            ...Platform.select(
                {
                    android: {
                        padding: 4,
                        color: 'rgb(255, 188, 66)',
                    },
                },
            ),
        },
    });
};

const CallAvatar = (props: Props) => {
    const style = getStyleSheet(props);
    return (
        <View style={style.pictureHalo}>
            <View style={style.pictureHalo2}>
                <View style={style.picture}>
                    {props.userId ?
                        <ProfilePicture
                            userId={props.userId}
                            size={props.size === 'm' || !props.size ? 40 : 72}
                            showStatus={false}
                        /> :
                        <CompassIcon
                            name='account-outline'
                            size={props.size === 'm' || !props.size ? 40 : 72}
                        />
                    }
                    {props.muted !== undefined &&
                        <CompassIcon
                            name={props.muted ? 'microphone-off' : 'microphone'}
                            size={16}
                            style={style.mute}
                        />}
                    {
                        props.raisedHand &&
                        <Text style={style.raisedHand}>
                            {'✋'}
                        </Text>
                    }
                </View>
            </View>
        </View>
    );
};
export default CallAvatar;
