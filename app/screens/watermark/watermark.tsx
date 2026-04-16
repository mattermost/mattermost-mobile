// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';

import {useServerUrl} from '@context/server';
import useDidMount from '@hooks/did_mount';
import {toMilliseconds} from '@utils/datetime';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel | undefined;
};

const WATERMARK_COLOR = 'rgba(128, 128, 128, 0.45)';
const ROW_HEIGHT = 130;
const TEXT_GAP = 50;
const ESTIMATED_CHAR_WIDTH_PX = 9; // ~9px per char for Body/75 typography at 11sp

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

    useDidMount(() => {
        const interval = setInterval(() => setNow(new Date()), toMilliseconds({minutes: 1}));
        return () => clearInterval(interval);
    });

    const username = currentUser?.username ?? '';
    const watermarkText = `${username}  ${serverUrl}  ${formatDate(now)}  ${formatTime(now)}`;

    // Diagonal of the screen — ensures the rotated square covers all corners
    const diagonal = Math.ceil(Math.sqrt((width * width) + (height * height))) + 80;
    const offsetX = (width - diagonal) / 2;
    const offsetY = (height - diagonal) / 2;

    const numRows = Math.ceil(diagonal / ROW_HEIGHT) + 2;

    const estimatedTextWidth = watermarkText.length * ESTIMATED_CHAR_WIDTH_PX;
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
            accessibilityElementsHidden={true}
            importantForAccessibility='no-hide-descendants'
        >
            <View style={[styles.diagonalLayer, layerStyle]}>
                {renderGrid()}
            </View>
        </View>
    );
};

export default WatermarkScreen;
