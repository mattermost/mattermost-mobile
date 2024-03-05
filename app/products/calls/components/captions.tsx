// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {clearTimeout} from '@testing-library/react-native/build/helpers/timers';
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity} from '@utils/theme';
import {displayUsername} from '@utils/user';

import type {CallSession, LiveCaptionMobile} from '@calls/types/calls';

const styles = StyleSheet.create({
    spacingContainer: {
        position: 'relative',
        width: '90%',
        height: 48,
    },
    captionContainer: {
        display: 'flex',
        height: 120,
        bottom: -72, // 120-48, to place the bottoms at the same place
        gap: 8,
        alignItems: 'center',
        flexDirection: 'column-reverse',
    },
    caption: {
        paddingTop: 1,
        paddingRight: 8,
        paddingBottom: 3,
        paddingLeft: 8,
        borderRadius: 4,
        backgroundColor: changeOpacity('#000', 0.64),
    },
    captionNotice: {
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
    },
    text: {
        color: '#FFF',
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontStyle: 'normal',
        fontWeight: '400',
        lineHeight: 22,
        textAlign: 'center',
    },
});

type Props = {
    captionsDict: Dictionary<LiveCaptionMobile>;
    sessionsDict: Dictionary<CallSession>;
    teammateNameDisplay: string;
}

const Captions = ({captionsDict, sessionsDict, teammateNameDisplay}: Props) => {
    const intl = useIntl();
    const [showCCNotice, setShowCCNotice] = useState(true);

    useEffect(() => {
        const timeoutID = setTimeout(() => {
            setShowCCNotice(false);
        }, 2000);
        return () => clearTimeout(timeoutID);
    }, []);

    const captionsArr = Object.values(captionsDict).reverse();

    if (showCCNotice && captionsArr.length > 0) {
        setShowCCNotice(false);
    }
    if (showCCNotice) {
        return (
            <View style={styles.spacingContainer}>
                <View style={styles.captionContainer}>
                    <View style={[styles.caption, styles.captionNotice]}>
                        <CompassIcon
                            name='closed-caption-outline'
                            color={'#FFF'}
                            size={18}
                            style={{alignSelf: 'center'}}
                        />
                        <Text style={styles.text}>
                            {'Live captions turned on'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.spacingContainer}>
            <View style={styles.captionContainer}>
                {captionsArr.map((cap) => (
                    <View
                        key={cap.captionId}
                        style={styles.caption}
                    >
                        <Text
                            style={styles.text}
                            numberOfLines={0}
                        >
                            {`(${displayUsername(sessionsDict[cap.sessionId]?.userModel, intl.locale, teammateNameDisplay)}) ${cap.text}`}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

export default Captions;
