// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import {LinearGradient, type LinearGradientProps} from 'expo-linear-gradient';
import React, {useMemo} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {imageDimensions} from '@share/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {SharedItem} from '@mattermost/rnshare';

type Props = {
    contentMode: 'small' | 'large';
    file: SharedItem;
    hasError: boolean;
    theme: Theme;
    type?: 'image' | 'video';
}

const GRADIENT_COLORS: LinearGradientProps['colors'] = ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, .16)'];
const GRADIENT_END = {x: 1, y: 1};
const GRADIENT_LOCATIONS: LinearGradientProps['locations'] = [0.5, 1];
const GRADIENT_START = {x: 0.3, y: 0.3};

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        borderRadius: 4,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowRadius: 3,
        shadowOpacity: 0.8,
        elevation: 1,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    error: {
        borderColor: theme.errorTextColor,
        borderWidth: 2,
    },
    play: {
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: 2,
        ...StyleSheet.absoluteFillObject,
    },
    radius: {
        borderRadius: 4,
    },
}));

const Thumbnail = ({contentMode, file, hasError, theme, type}: Props) => {
    const dimensions = useWindowDimensions();
    const styles = getStyles(theme);
    const isSmall = contentMode === 'small';
    const imgStyle = useMemo(() => {
        if (isSmall) {
            return {
                height: 104,
                width: 104,
            };
        }

        if (!file.width || !file.height) {
            return {
                height: 0,
                width: 0,
            };
        }

        return imageDimensions(file.height!, file.width!, 156, dimensions.width - 20);
    }, [isSmall, file, dimensions.width]);

    const containerStyle = useMemo(() => ([
        styles.container,
        hasError && styles.error,
        styles.radius,
    ]), [styles, hasError]);

    const source = useMemo(() => ({uri: type === 'video' ? file.videoThumb : file.value}), [type, file]);

    return (
        <View style={containerStyle}>
            <View style={styles.center}>
                <Image
                    source={source}
                    style={[imgStyle, styles.radius]}
                    contentFit='cover'
                />
                {type === 'video' &&
                <>
                    <LinearGradient
                        start={GRADIENT_START}
                        end={GRADIENT_END}
                        locations={GRADIENT_LOCATIONS}
                        colors={GRADIENT_COLORS}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.play}>
                        <CompassIcon
                            name='play'
                            size={20}
                            color='white'
                        />
                    </View>
                </>
                }
            </View>
        </View>
    );
};

export default Thumbnail;
