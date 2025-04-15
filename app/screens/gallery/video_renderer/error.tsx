// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React, {type Dispatch, type SetStateAction, useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableWithoutFeedback, useWindowDimensions, View} from 'react-native';
import Animated from 'react-native-reanimated';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Preferences} from '@constants';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {calculateDimensions} from '@utils/images';
import {typography} from '@utils/typography';

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    filename: {
        color: '#FFF',
        ...typography('Body', 200, 'SemiBold'),
        marginVertical: 8,
        paddingHorizontal: 25,
        textAlign: 'center',
    },
    unsupported: {
        color: '#FFF',
        ...typography('Body', 100, 'SemiBold'),
        marginTop: 10,
        paddingHorizontal: 25,
        opacity: 0.64,
        textAlign: 'center',
    },
    marginBottom: {
        marginBottom: 16,
    },
    marginTop: {
        marginTop: 16,
    },
});

type Props = {
    filename: string;
    height: number;
    isDownloading: boolean;
    isRemote: boolean;
    onShouldHideControls: () => void;
    posterUri?: string;
    setDownloading: Dispatch<SetStateAction<boolean>>;
    width: number;
}

const VideoError = ({filename, height, isDownloading, isRemote, onShouldHideControls, posterUri, setDownloading, width}: Props) => {
    const [hasPoster, setHasPoster] = useState(false);
    const [loadPosterError, setLoadPosterError] = useState(false);
    const dimensions = useWindowDimensions();
    const intl = useIntl();

    const handleDownload = useCallback(() => {
        setDownloading(true);
    }, [setDownloading]);

    const handlePosterSet = useCallback(() => {
        setHasPoster(true);
    }, []);

    const handlePosterError = useCallback(() => {
        setLoadPosterError(true);
    }, []);

    let poster;
    if (posterUri && !loadPosterError) {
        const imageDimensions = calculateDimensions(height, width, dimensions.width);
        poster = (
            <Image
                source={{uri: posterUri}}
                style={hasPoster && imageDimensions}
                onLoad={handlePosterSet}
                onError={handlePosterError}
            />
        );
    } else {
        poster = (
            <CompassIcon
                color='#338AFF' // yes this is hardcoded
                name='file-video-outline-large'
                size={120}
            />
        );
    }

    return (
        <TouchableWithoutFeedback
            onPress={onShouldHideControls}
            style={styles.container}
        >
            <Animated.View style={styles.container}>
                {poster}
                <Text
                    numberOfLines={2}
                    style={styles.filename}
                >
                    {filename}
                </Text>
                {isRemote &&
                <View style={styles.marginTop}>
                    <View style={styles.marginBottom}>
                        <FormattedText
                            defaultMessage='This video must be downloaded to play it.'
                            id='video.download_description'
                            style={styles.unsupported}
                        />
                    </View>
                    <Button
                        disabled={isDownloading}
                        onPress={handleDownload}
                        theme={Preferences.THEMES.onyx}
                        size={'lg'}
                        textStyle={buttonTextStyle(Preferences.THEMES.onyx, 'lg', 'primary', isDownloading ? 'disabled' : 'default')}
                        text={intl.formatMessage({id: 'video.download', defaultMessage: 'Download video'})}
                        backgroundStyle={buttonBackgroundStyle(Preferences.THEMES.onyx, 'lg', 'primary', isDownloading ? 'disabled' : 'default')}
                    />
                </View>
                }
                {!isRemote &&
                <FormattedText
                    defaultMessage='An error occurred while trying to play the video.'
                    id='video.failed_description'
                    style={styles.unsupported}
                />
                }
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

export default VideoError;
