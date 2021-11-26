// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';

type Props = {
    onPress: () => void;
}

const style = StyleSheet.create({
    failed: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        position: 'absolute',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
});

export default function UploadRetry({
    onPress,
}: Props) {
    return (
        <TouchableWithFeedback
            style={style.failed}
            onPress={onPress}
            type='opacity'
        >
            <CompassIcon
                name='refresh'
                size={25}
                color='#fff'
            />
        </TouchableWithFeedback>
    );
}
