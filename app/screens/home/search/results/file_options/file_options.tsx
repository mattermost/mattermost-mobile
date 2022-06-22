// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useState} from 'react';
import {View, Text} from 'react-native';

import {fetchPostById} from '@actions/remote/post';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import FormattedDate from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import FileIcon from '@components/post_list/post/body/files/file_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import Action from '@screens/gallery/footer/actions/action';
import CopyPublicLink from '@screens/gallery/footer/copy_public_link';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';
import {dismissBottomSheet} from '@screens/navigation';
import {getFormattedFileSize} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const format = 'MMM DD YYYY HH:MM A';

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
        actionsContainer: {
            marginHorizontal: -15,
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
        menuText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        toast: {
            marginTop: 100,
            alignItems: 'center',
        },
    };
});

type FileOption = {
    id: string;
    iconName: string;
    defaultMessage: string;
}

const dataDownload: FileOption = {
    id: t('screen.search.results.file_options.download'),
    iconName: 'download-outline',
    defaultMessage: 'Download',
};

const dataGoto: FileOption = {
    id: t('screen.search.results.file_options.open_in_channel'),
    iconName: 'globe',
    defaultMessage: 'Open in channel',
};

const dataCopyLink: FileOption = {
    id: t('screen.search.results.file.copy_link'),
    iconName: 'link-variant',
    defaultMessage: 'Copy Link',
};

type Props = {
    canDownloadFiles: boolean;
    enablePublicLink: boolean;
    fileInfo: FileInfo;
}
const FileOptions = ({fileInfo, canDownloadFiles, enablePublicLink}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const [action, setAction] = useState<GalleryAction>('none');

    const galleryItem = {...fileInfo, type: 'image'} as GalleryItemType;

    const handleDownload = useCallback(async () => {
        setAction('downloading');
    }, []);

    const handleCopyLink = useCallback(async () => {
        setAction('copying');
    }, []);

    const handleGotoChannel = useCallback(async () => {
        const fetchedPost = await fetchPostById(serverUrl, fileInfo.post_id, true);
        const post = fetchedPost.post;
        const rootId = post?.root_id || post?.id;
        if (rootId) {
            fetchAndSwitchToThread(serverUrl, rootId);
        } else {
            // what to do?
        }
    }, [fileInfo]);

    const renderLabelComponent = useCallback((item: FileOption) => {
        return (
            <FormattedText
                style={style.menuText}
                id={item.id}
                defaultMessage={item.defaultMessage}
            />
        );
    }, [style]);

    const renderHeader = useCallback(() => {
        const size = getFormattedFileSize(fileInfo.size);
        return (
            <View style={style.headerContainer}>
                <View style={style.fileIconContainer}>
                    <FileIcon
                        file={fileInfo}
                        iconSize={72}
                    />
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
    }, [fileInfo]);

    return (
        <View style={style.container}>
            {renderHeader()}
            <View style={style.actionsContainer}>
                {canDownloadFiles &&
                <MenuItem
                    labelComponent={renderLabelComponent(dataDownload)}
                    iconName={dataDownload.iconName}
                    onPress={handleDownload}
                    testID={dataDownload.id}
                    theme={theme}
                    separator={false}
                />
                }
                <MenuItem
                    labelComponent={renderLabelComponent(dataGoto)}
                    iconName={dataGoto.iconName}
                    onPress={handleGotoChannel}
                    testID={dataGoto.id}
                    theme={theme}
                    separator={false}
                />
                {enablePublicLink &&
                <MenuItem
                    labelComponent={renderLabelComponent(dataCopyLink)}
                    iconName={dataCopyLink.iconName}
                    onPress={handleCopyLink}
                    testID={dataCopyLink.id}
                    theme={theme}
                    separator={false}
                />
                }
            </View>
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
