// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import {CameraOptions} from 'react-native-image-picker';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/preferences';

type Props = {
    onPress: (options: CameraOptions) => void;
    theme: Theme;
}

const getStyle = makeStyleSheetFromTheme((theme: Theme) => ({
    center: {
        alignItems: 'center',
    },
    container: {
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
        height: 200,
        paddingVertical: 10,
    },
    flex: {
        flex: 1,
    },
    options: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        width: '100%',
        marginBottom: 20,
    },
    optionContainer: {
        alignItems: 'flex-start',
    },
    title: {
        color: theme.centerChannelColor,
        fontSize: 18,
        fontWeight: 'bold',
    },
    text: {
        color: theme.centerChannelColor,
        fontSize: 15,
    },
}));

const CameraType = ({onPress, theme}: Props) => {
    const style = getStyle(theme);

    const onPhoto = () => {
        const options: CameraOptions = {
            quality: 0.8,
            mediaType: 'photo',
            saveToPhotos: true,
        };

        onPress(options);
    };

    const onVideo = () => {
        const options: CameraOptions = {
            videoQuality: 'high',
            mediaType: 'video',
            saveToPhotos: true,
        };

        onPress(options);
    };

    return (
        <View style={style.container}>
            <FormattedText
                id='camera_type.title'
                defaultMessage='Choose an action'
                style={style.title}
            />
            <View style={style.options}>
                <View style={style.flex}>
                    <TouchableWithFeedback
                        onPress={onPhoto}
                        testID='camera_type.photo'
                    >
                        <View style={style.center}>
                            <CompassIcon
                                color={theme.centerChannelColor}
                                name='camera-outline'
                                size={38}
                            />
                            <FormattedText
                                id='camera_type.photo.option'
                                defaultMessage='Capture Photo'
                                style={style.text}
                            />
                        </View>
                    </TouchableWithFeedback>
                </View>
                <View style={style.flex}>
                    <TouchableWithFeedback
                        onPress={onVideo}
                        testID='camera_type.video'
                    >
                        <View style={style.center}>
                            <CompassIcon
                                color={theme.centerChannelColor}
                                name='video-outline'
                                size={38}
                            />
                            <FormattedText
                                id='camera_type.video.option'
                                defaultMessage='Record Video'
                                style={style.text}
                            />
                        </View>
                    </TouchableWithFeedback>
                </View>
            </View>
        </View>
    );
};

export default CameraType;
