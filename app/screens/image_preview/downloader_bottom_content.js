// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import FormattedText from 'app/components/formatted_text';
import {View, StyleSheet} from 'react-native';
import PropTypes from 'prop-types';

const DownloaderBottomContent = ({saveToCameraRoll, isVideo, progressPercent}) => {
    const realFill = Number(progressPercent.toFixed(0));

    if (realFill === 0) {
        return null;
    }

    let savedComponent;
    if (realFill < 100) {
        savedComponent = (
            <FormattedText
                id='mobile.downloader.downloading'
                defaultMessage='Downloading...'
                style={styles.bottomText}
            />
        );
    } else if (saveToCameraRoll && isVideo) {
        savedComponent = (
            <FormattedText
                id='mobile.downloader.video_saved'
                defaultMessage='Video Saved'
                style={styles.bottomText}
            />
        );
    } else if (saveToCameraRoll) {
        savedComponent = (
            <FormattedText
                id='mobile.downloader.image_saved'
                defaultMessage='Image Saved'
                style={styles.bottomText}
            />
        );
    } else {
        savedComponent = (
            <FormattedText
                id='mobile.downloader.complete'
                defaultMessage='Download complete'
                style={styles.bottomText}
            />
        );
    }

    return (
        <View style={styles.bottomContent}>
            {savedComponent}
        </View>
    );
};

DownloaderBottomContent.propTypes = {
    saveToCameraRoll: PropTypes.bool,
    isVideo: PropTypes.bool,
    progressPercent: PropTypes.number,
};

const styles = StyleSheet.create({
    bottomContent: {
        alignItems: 'center',
        marginTop: 10,
    },
    bottomText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default DownloaderBottomContent;
