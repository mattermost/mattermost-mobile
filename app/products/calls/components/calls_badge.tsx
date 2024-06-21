// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {typography} from '@utils/typography';

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
    loading: {
        padding: 6,
        color: 'white',
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
    recording: {
        padding: 6,
        color: 'white',
        backgroundColor: '#D24B4E',
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
    Waiting,
    Rec,
    Host,
}

interface Props {
    type: CallsBadgeType;
}

const CallsBadge = ({type}: Props) => {
    const isLoading = type === CallsBadgeType.Waiting;
    const isRec = type === CallsBadgeType.Rec;
    const isParticipant = !(isLoading || isRec);

    const text = isParticipant ? (
        <FormattedText
            id={'mobile.calls_host'}
            defaultMessage={'host'}
            style={[styles.text, styles.recordingText]}
        />
    ) : null;

    const containerStyles = [
        styles.container,
        isLoading && styles.loading,
        isRec && styles.recording,
        isParticipant && styles.participant,
    ];
    return (
        <View style={containerStyles}>
            {
                isLoading && <Loading size={16}/>
            }
            {
                isRec &&
                <CompassIcon
                    name={'record-circle-outline'}
                    size={16}
                    color={styles.text.color}
                />
            }
            {text}
        </View>
    );
};

export default CallsBadge;
