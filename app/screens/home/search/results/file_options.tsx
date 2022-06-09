// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import FormattedDate from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import FileIcon from '@components/post_list/post/body/files/file_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';
import {getFormattedFileSize} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        headerContainer: {
            float: 'left',
            marginLeft: 20,
        },
        iconContainer: {
            marginLeft: -10,
            alignSelf: 'flex-start',
        },
        nameText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 400, 'Regular'),
        },
        infoContainer: {
            alignItems: 'center',
            flexDirection: 'row',
        },
        infoText: {
            flexDirection: 'row',
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 200, 'Regular'),
        },
        date: {
            marginBottom: 2,
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 200, 'Regular'),
        },
        menuText: {
            color: theme.centerChannelColor,
        },
    };
});

type FileOption = {
    id: string;
    iconName: string;
    defaultMessage: string;
}

const data: FileOption[] = [
    {
        id: t('screen.search.results.file_options.download'),
        iconName: 'download-outline',
        defaultMessage: 'Download',
    }, {
        id: t('screen.search.results.file_options.open_in_channel'),
        iconName: 'globe',
        defaultMessage: 'Open in channel',
    }, {
        id: t('screen.search.results.file.copy_link'),
        iconName: 'link-variant',
        defaultMessage: 'Copy Link',
    },
];

type Props = {
    fileInfo: FileInfo;
}

const Filter = ({fileInfo}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();

    const renderLabelComponent = useCallback((item: FileOption) => {
        return (
            <FormattedText
                style={style.menuText}
                id={item.id}
                defaultMessage={item.defaultMessage}
            />
        );
    }, [style]);

    const handlePress = (item: FileOption) => {
        switch (item.iconName) {
            case 'download-outline':
                dismissBottomSheet();
                break;
            case 'globe':
                dismissBottomSheet();
                break;
            case 'link-variant':
                dismissBottomSheet();

                //Clipboard.setString(`${serverUrl}/${fileInfo.teamName}/pl/${this.props.fileInfo.post_id}`);
                break;

            default:
        }
    };

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
                <Text style={style.nameText}>{fileInfo.name}</Text>
                <View style={style.infoContainer}>
                    <Text style={style.infoText}>{size}</Text>
                    <Text style={style.infoText}>{' • '}</Text>
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
        <BottomSheetContent
            showButton={false}
            showTitle={!isTablet}
            testID='file.options'
        >
            {renderHeader()}
            <FlatList
                data={data}
                renderItem={renderItem}
                contentContainerStyle={style.contentContainer}
            />
        </BottomSheetContent>
    );
};

export default Filter;
