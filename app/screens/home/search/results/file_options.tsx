// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {View, Text} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import {switchToChannelById} from '@actions/remote/channel';
import {fetchPostById} from '@actions/remote/post';
import FormattedDate from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import FileIcon from '@components/post_list/post/body/files/file_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import CopyPublicLink from '@screens/gallery/footer/copy_public_link';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';
import {getFormattedFileSize} from '@utils/file';
import {OptionsActions, OptionActionType} from '@utils/search';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: -20,
            marginLeft: -20,
        },
        headerContainer: {
            float: 'left',
            marginLeft: 20,
            marginTop: 20,
            marginBottom: 8,
        },
        iconContainer: {
            marginLeft: -10,
            marginBottom: 8,
            alignSelf: 'flex-start',
        },
        nameText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 400, 'SemiBold'),
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
    };
});

type FileOption = {
    id: string;
    iconName: string;
    type: OptionActionType;
    defaultMessage: string;
}

const data: FileOption[] = [
    {
        id: t('screen.search.results.file_options.download'),
        iconName: 'download-outline',
        type: OptionsActions.DOWNLOAD,
        defaultMessage: 'Download',
    }, {
        id: t('screen.search.results.file_options.open_in_channel'),
        iconName: 'globe',
        type: OptionsActions.GOTO_CHANNEL,
        defaultMessage: 'Open in channel',
    }, {
        id: t('screen.search.results.file.copy_link'),
        iconName: 'link-variant',
        type: OptionsActions.COPY_LINK,
        defaultMessage: 'Copy Link',
    },
];

type Props = {
    fileInfo: FileInfo;
}
const FileOptions = ({fileInfo}: Props) => {
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
        const post = await fetchPostById(serverUrl, fileInfo.post_id, true);
        switchToChannelById(serverUrl, post!.post!.channel_id);

        // TODO: scroll to post in channel
    }, []);

    const handlePress = (item: FileOption) => {
        switch (item.type) {
            case OptionsActions.DOWNLOAD:
                handleDownload();
                break;
            case OptionsActions.GOTO_CHANNEL:
                handleGotoChannel();
                break;
            case OptionsActions.COPY_LINK:
                handleCopyLink();
                break;

            default:
        }

        // TODO: determine when and if to dismiss the modal
        // dismissBottomSheet();
    };

    const renderLabelComponent = useCallback((item: FileOption) => {
        return (
            <FormattedText
                style={style.menuText}
                id={item.id}
                defaultMessage={item.defaultMessage}
            />
        );
    }, [style]);

    const renderHeader = () => {
        const size = getFormattedFileSize(fileInfo.size);
        const format = 'MMM DD YYYY HH:MM A';
        return (
            <View style={style.headerContainer}>
                <View style={style.iconContainer}>
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
    };

    const renderItem = useCallback(({item}: {item: FileOption}) => {
        return (
            <MenuItem
                labelComponent={renderLabelComponent(item)}
                iconName={item.iconName}
                iconContainerStyle={style.selected}
                onPress={() => handlePress(item)}
                testID={item.id}
                theme={theme}
                separator={false}
            />
        );
    }, [renderLabelComponent, theme]);

    return (
        <View style={style.container}>
            {renderHeader()}
            <FlatList
                data={data}
                renderItem={renderItem}
                contentContainerStyle={style.contentContainer}
            />
            {['downloading'].includes(action) &&
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

    );
};

export default FileOptions;
