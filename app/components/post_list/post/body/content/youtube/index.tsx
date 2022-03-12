// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Image, Platform, StatusBar, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {YouTubeStandaloneAndroid, YouTubeStandaloneIOS} from 'react-native-youtube';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import ProgressiveImage from '@components/progressive_image';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useIsTablet} from '@hooks/device';
import {emptyFunction} from '@utils/general';
import {calculateDimensions, getViewPortWidth} from '@utils/images';
import {getYouTubeVideoId, tryOpenURL} from '@utils/url';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

type YouTubeProps = {
    googleDeveloperKey?: string;
    isReplyPost: boolean;
    layoutWidth?: number;
    metadata: PostMetadata;
}

const MAX_YOUTUBE_IMAGE_HEIGHT = 202;
const MAX_YOUTUBE_IMAGE_WIDTH = 360;
const timeRegex = /[\\?&](t|start|time_continue)=([0-9]+h)?([0-9]+m)?([0-9]+s?)/;

const styles = StyleSheet.create({
    imageContainer: {
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginBottom: 6,
        marginTop: 10,
    },
    image: {
        alignItems: 'center',
        borderRadius: 3,
        justifyContent: 'center',
        marginVertical: 1,
    },
    playButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const YouTube = ({googleDeveloperKey, isReplyPost, layoutWidth, metadata}: YouTubeProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const link = metadata.embeds![0].url;
    const videoId = getYouTubeVideoId(link);
    const dimensions = calculateDimensions(
        MAX_YOUTUBE_IMAGE_HEIGHT,
        MAX_YOUTUBE_IMAGE_WIDTH,
        layoutWidth || getViewPortWidth(isReplyPost, isTablet),
    );

    const getYouTubeTime = () => {
        const time = link.match(timeRegex);
        if (!time || !time[0]) {
            return 0;
        }

        const hours = time[2] ? time[2].match(/([0-9]+)h/) : null;
        const minutes = time[3] ? time[3].match(/([0-9]+)m/) : null;
        const seconds = time[4] ? time[4].match(/([0-9]+)s?/) : null;

        let ticks = 0;

        if (hours && hours[1]) {
            ticks += parseInt(hours[1], 10) * 3600;
        }

        if (minutes && minutes[1]) {
            ticks += parseInt(minutes[1], 10) * 60;
        }

        if (seconds && seconds[1]) {
            ticks += parseInt(seconds[1], 10);
        }

        return ticks;
    };

    const playYouTubeVideo = useCallback(() => {
        const startTime = getYouTubeTime();

        if (googleDeveloperKey) {
            if (Platform.OS === 'ios') {
                YouTubeStandaloneIOS.
                    playVideo(videoId, startTime).
                    then(playYouTubeVideoEnded).
                    catch(playYouTubeVideoError);
                return;
            }

            YouTubeStandaloneAndroid.playVideo({
                apiKey: googleDeveloperKey,
                videoId,
                autoplay: true,
                startTime,
            }).catch(playYouTubeVideoError);
        } else {
            const onError = () => {
                Alert.alert(
                    intl.formatMessage({
                        id: 'mobile.link.error.title',
                        defaultMessage: 'Error',
                    }),
                    intl.formatMessage({
                        id: 'mobile.link.error.text',
                        defaultMessage: 'Unable to open the link.',
                    }),
                );
            };

            tryOpenURL(link, onError);
        }
    }, []);

    const playYouTubeVideoEnded = () => {
        if (Platform.OS === 'ios') {
            StatusBar.setHidden(false);
        }
    };

    const playYouTubeVideoError = (errorMessage: string) => {
        Alert.alert(
            intl.formatMessage({
                id: 'mobile.youtube_playback_error.title',
                defaultMessage: 'YouTube playback error',
            }),
            intl.formatMessage({
                id: 'mobile.youtube_playback_error.description',
                defaultMessage: 'An error occurred while trying to play the YouTube video.\nDetails: {details}',
            }, {
                details: errorMessage,
            }),
        );
    };

    let imgUrl;
    if (metadata.images) {
        imgUrl = Object.keys(metadata.images)[0];
    }

    if (!imgUrl) {
        // Fallback to default YouTube thumbnail if available
        imgUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return (
        <TouchableOpacity
            style={[styles.imageContainer, {height: dimensions.height}]}
            onPress={playYouTubeVideo}
        >
            <ProgressiveImage
                id={imgUrl}
                isBackgroundImage={true}
                imageUri={imgUrl}
                style={[styles.image, dimensions]}
                resizeMode='cover'
                onError={emptyFunction}
            >
                <View style={styles.playButton}>
                    <Image source={require('@assets/images/icons/youtube-play-icon.png')}/>
                </View>
            </ProgressiveImage>
        </TouchableOpacity>
    );
};

const withGoogleKey = withObservables([], ({database}: WithDatabaseArgs) => ({
    googleDeveloperKey: database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap(({value}: {value: ClientConfig}) => {
            return of$(value.GoogleDeveloperKey);
        }),
    ),
}));

export default withDatabase(withGoogleKey(React.memo(YouTube)));
