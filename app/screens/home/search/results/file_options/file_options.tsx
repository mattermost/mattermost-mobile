// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import {showPermalink} from '@actions/remote/permalink';
import {fetchPostById} from '@actions/remote/post';
import FileIcon from '@components/files/file_icon';
import ImageFile from '@components/files/image_file';
import VideoFile from '@components/files/video_file';
import FormattedDate from '@components/formatted_date';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import CopyPublicLink from '@screens/gallery/footer/copy_public_link';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';
import {getFormattedFileSize, isImage, isVideo} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const format = 'MMM DD YYYY HH:MM A';

export const TOAST_MARGIN_BOTTOM = 40;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: -20,
        },
        headerContainer: {
            float: 'left',
            marginTop: 20,
            marginBottom: 8,
        },
        fileIconContainer: {
            marginLeft: -10,
            marginBottom: 8,
            alignSelf: 'flex-start',
        },
        nameText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 400, 'SemiBold'),
        },
        imageVideo: {
            marginLeft: 10,
            height: 72,
            width: 72,
        },
        optionContainer: {
            marginHorizontal: -20,
            paddingHorizontal: 20,
        },
        infoContainer: {
            marginVertical: 8,
            alignItems: 'center',
            flexDirection: 'row',
        },
        infoText: {
            flexDirection: 'row',
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 200, 'Regular'),
        },
        date: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 200, 'Regular'),
        },
        toast: {
            marginTop: 100,
            alignItems: 'center',
        },
    };
});

type Props = {
    canDownloadFiles: boolean;
    enablePublicLink: boolean;
    fileInfo: FileInfo;
}
const FileOptions = ({fileInfo, canDownloadFiles, enablePublicLink}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();
    const ref = useRef<any>();
    const serverUrl = useServerUrl();
    const [action, setAction] = useState<GalleryAction>('none');

    const galleryItem = {...fileInfo, type: 'image'} as GalleryItemType;
    const size = getFormattedFileSize(fileInfo.size);

    const handleDownload = useCallback(() => {
        setAction('downloading');
    }, []);

    const handleCopyLink = useCallback(() => {
        setAction('copying');
    }, []);

    const handlePermalink = useCallback(async () => {
        const fetchedPost = await fetchPostById(serverUrl, fileInfo.post_id, true);
        const post = fetchedPost.post;
        const rootId = post?.root_id || post?.id;
        if (rootId) {
            showPermalink(serverUrl, '', post.id, intl);
        }
    }, [fileInfo]);

    const renderIcon = () => {
        switch (true) {
            case isImage(fileInfo):
                return (
                    <View style={style.imageVideo}>
                        <ImageFile
                            file={fileInfo}
                            forwardRef={ref}
                            inViewPort={true}
                            resizeMode={'cover'}
                        />
                    </View>
                );
            case isVideo(fileInfo):
                return (
                    <View style={style.imageVideo}>
                        <VideoFile
                            file={fileInfo}
                            forwardRef={ref}
                            resizeMode={'cover'}
                            inViewPort={true}
                            index={0}
                            wrapperWidth={78}
                        />
                    </View>
                );
            default:
                return (
                    <FileIcon
                        file={fileInfo}
                        iconSize={72}
                    />
                );
        }
    };

    const renderHeader = () => {
        return (
            <View style={style.headerContainer}>
                <View style={style.fileIconContainer}>
                    {renderIcon()}
                </View>
                <Text
                    style={style.nameText}
                    numberOfLines={2}
                    ellipsizeMode={'tail'}
                >
                    {fileInfo.name}
                </Text>
                <View style={style.infoContainer}>
                    <Text style={style.infoText}>{`${size} • `}</Text>
                    <FormattedDate
                        style={style.date}
                        format={format}
                        value={fileInfo.create_at as number}
                    />
                </View>
            </View>
        );
    };

    return (
        <View style={style.container}>
            {renderHeader()}
            {canDownloadFiles &&
                <OptionItem
                    action={handleDownload}
                    label={intl.formatMessage({id: 'screen.search.results.file_options.download', defaultMessage: 'Download'})}
                    icon={'download-outline'}
                    type='default'
                    containerStyle={style.optionContainer}
                />
            }
            <OptionItem
                action={handlePermalink}
                label={intl.formatMessage({id: 'screen.search.results.file_options.open_in_channel', defaultMessage: 'Open in channel'})}
                icon={'globe'}
                type='default'
                containerStyle={style.optionContainer}
            />
            {enablePublicLink &&
                <OptionItem
                    action={handleCopyLink}
                    label={intl.formatMessage({id: 'screen.search.results.file_options.copy_link', defaultMessage: 'Copy link'})}
                    icon={'link-variant'}
                    type='default'
                    containerStyle={style.optionContainer}
                />
            }
            <View style={style.toast} >
                {action === 'downloading' &&
                    <DownloadWithAction
                        action={action}
                        item={galleryItem}
                        setAction={setAction}
                    />
                }
                {action === 'copying' &&
                    <CopyPublicLink
                        item={galleryItem}
                        setAction={setAction}
                    />
                }
            </View>
        </View>
    );
};

export default FileOptions;
