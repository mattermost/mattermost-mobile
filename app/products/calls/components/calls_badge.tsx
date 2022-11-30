// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {typography} from '@utils/typography';

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
    recording: {
        paddingLeft: 8,
        paddingRight: 8,
        backgroundColor: '#D24B4E',
        color: 'white',
        height: 34,
    },
    text: {
        color: 'white',
        textTransform: 'uppercase',
    },
    recordingText: {
        marginLeft: 6,
        ...typography('Body', 75, 'SemiBold'),
    },
    participant: {
        marginTop: 6,
        paddingLeft: 2,
        paddingRight: 6,
        paddingTop: 2,
        paddingBottom: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
    participantText: {
        ...typography('Body', 25, 'SemiBold'),
    },
});

export enum CallsBadgeType {
    Rec,
    Host,
}

interface Props {
    type: CallsBadgeType;
}

const CallsBadge = ({type}: Props) => {
    const isRec = type === CallsBadgeType.Rec;

    const text = isRec ? (
        <FormattedText
            id={'mobile.calls_rec'}
            defaultMessage={'rec'}
            style={[styles.text, styles.recordingText]}
        />
    ) : (
        <FormattedText
            id={'mobile.calls_host'}
            defaultMessage={'host'}
            style={[styles.text, styles.recordingText]}
        />
    );

    return (
        <View style={[styles.container, isRec ? styles.recording : styles.participant]}>
            {
                isRec &&
                <CompassIcon
                    name={'record-circle-outline'}
                    size={12}
                    color={styles.text.color}
                />
            }
            {text}
        </View>
    );
};

export default CallsBadge;
