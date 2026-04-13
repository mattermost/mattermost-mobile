// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';

import {useServerUrl} from '@context/server';
import {observeCurrentUser} from '@queries/servers/user';
import {toMilliseconds} from '@utils/datetime';
import {typography} from '@utils/typography';
import {getUrlDomain} from '@utils/url';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel | undefined;
};

const WATERMARK_COLOR = 'rgba(128, 128, 128, 0.45)';
const ROW_HEIGHT = 130;
const TEXT_GAP = 50;

const styles = {
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden' as const,
    },
    diagonalLayer: {
        position: 'absolute' as const,
        transform: [{rotate: '-45deg'}],
    },
    row: {
        position: 'absolute' as const,
        flexDirection: 'row' as const,
    },
    text: {
        ...typography('Body', 75, 'Regular'),
        color: WATERMARK_COLOR,
        marginRight: TEXT_GAP,
    },
};

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).format(date);
}

function formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
    }).format(date);
}

const WatermarkScreen = ({currentUser}: Props) => {
    const serverUrl = useServerUrl();
    const {width, height} = useWindowDimensions();
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), toMilliseconds({minutes: 1}));
        return () => clearInterval(interval);
    }, []);

    const domain = getUrlDomain(serverUrl);
    const username = currentUser?.username ?? '';
    const watermarkText = `${username}  ${domain}  ${formatDate(now)}  ${formatTime(now)}`;

    // Diagonal of the screen — ensures the rotated square covers all corners
    const diagonal = Math.ceil(Math.sqrt((width * width) + (height * height))) + 80;
    const offsetX = (width - diagonal) / 2;
    const offsetY = (height - diagonal) / 2;

    const numRows = Math.ceil(diagonal / ROW_HEIGHT) + 2;

    // Approximate character width for Body/75 typography (~9px per char at 11sp)
    const estimatedTextWidth = watermarkText.length * 9;
    const colWidth = estimatedTextWidth + TEXT_GAP;
    const numCols = Math.ceil(diagonal / colWidth) + 2;

    const renderGrid = () =>
        Array.from({length: numRows}, (_rowItem, row) => {
            const staggerOffset = row % 2 === 0 ? 0 : colWidth / 2;
            return (
                <View
                    key={row}
                    style={[styles.row, {top: row * ROW_HEIGHT, left: -staggerOffset}]}
                >
                    {Array.from({length: numCols + 1}, (_colItem, col) => (
                        <Text
                            key={col}
                            numberOfLines={1}
                            style={styles.text}
                        >
                            {watermarkText}
                        </Text>
                    ))}
                </View>
            );
        });

    const layerStyle = {
        width: diagonal,
        height: diagonal,
        left: offsetX,
        top: offsetY,
    };

    return (
        <View
            style={styles.container}
            pointerEvents='none'
        >
            <View style={[styles.diagonalLayer, layerStyle]}>
                {renderGrid()}
            </View>
        </View>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
}));

export default withDatabase(enhanced(WatermarkScreen));
