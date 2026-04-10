// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {observeCurrentUser} from '@queries/servers/user';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUrlDomain} from '@utils/url';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel | undefined;
    componentId: string;
};

const WATERMARK_COLOR = 'rgba(128, 128, 128, 0.45)';
const ROW_HEIGHT = 130;
const TEXT_GAP = 50;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    diagonalLayer: {
        position: 'absolute',
    },
    row: {
        position: 'absolute',
        flexDirection: 'row',
    },
}));

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

const WatermarkScreen = ({currentUser}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const {width, height} = useWindowDimensions();
    const [now, setNow] = useState(() => new Date());
    const styles = getStyleSheet(theme);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const domain = getUrlDomain(serverUrl);
    const username = currentUser?.username ?? '';
    const watermarkText = `${username}  ${domain}  ${formatDate(now)}  ${formatTime(now)}`;

    // Diagonal of the screen — ensures the rotated square covers all corners
    const diagonal = Math.ceil(Math.sqrt(width * width + height * height)) + 80;
    const offsetX = (width - diagonal) / 2;
    const offsetY = (height - diagonal) / 2;

    const numRows = Math.ceil(diagonal / ROW_HEIGHT) + 2;
    // Approximate character width for Body/75 typography (~9px per char at 11sp)
    const estimatedTextWidth = watermarkText.length * 9;
    const colWidth = estimatedTextWidth + TEXT_GAP;
    const numCols = Math.ceil(diagonal / colWidth) + 2;

    const textStyle = {
        ...typography('Body', 75, 'Regular'),
        color: WATERMARK_COLOR,
        marginRight: TEXT_GAP,
    };

    const renderGrid = () =>
        Array.from({length: numRows}, (_, row) => {
            const staggerOffset = row % 2 === 0 ? 0 : colWidth / 2;
            return (
                <View
                    key={row}
                    style={[styles.row, {top: row * ROW_HEIGHT, left: -staggerOffset}]}
                >
                    {Array.from({length: numCols + 1}, (_, col) => (
                        <Text
                            key={col}
                            numberOfLines={1}
                            style={textStyle}
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
            <View style={[styles.diagonalLayer, layerStyle, {transform: [{rotate: '-45deg'}]}]}>
                {renderGrid()}
            </View>
        </View>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
}));

export default withDatabase(enhanced(WatermarkScreen));
