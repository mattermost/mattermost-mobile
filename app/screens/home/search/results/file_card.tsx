// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedDate from '@components/formatted_date';
import FileIcon from '@components/post_list/post/body/files/file_icon';
import {useTheme} from '@context/theme';
import {getFormattedFileSize} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    fileInfo: FileInfo;
    channelName: string;
}

const format = 'MMM DD HH:MM A';
const hitSlop = {top: 5, bottom: 5, left: 5, right: 5};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',

            marginHorizontal: 20,
            marginVertical: 4,
            paddingVertical: 8,

            borderWidth: 1,
            borderRadius: 4,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),

            shadowColor: changeOpacity(theme.centerChannelColor, 0.16),
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.8,
            elevation: 1,
        },
        flexRow: {flexDirection: 'row'},
        iconContainer: {
            marginHorizontal: 8,
        },
        textContainer: {
            flex: 1,
            flexDirection: 'column',
            flexGrow: 1,
        },
        nameText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'SemiBold'),
        },
        infoText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
        fileStatsContainer: {
            flexGrow: 1,
            flexDirection: 'row',
        },
        channelText: {
            marginRight: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
            paddingHorizontal: 4,
        },
        threeDotContainer: {
            alignItems: 'flex-end',
            marginHorizontal: 20,
        },
    };
});

export default function FileCard({channelName, fileInfo}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const size = getFormattedFileSize(fileInfo.size);

    // TODO: hook this up
    const openGallery = () => {
        /* eslint-disable no-console */
        console.log('Open Gallery');
    };

    // TODO: hook this up
    const handleThreeDotPress = () => {
        /* eslint-disable no-console */
        console.log('pressed 3 dot');
    };

    // TODO: Get the channel name and display
    // const channelName = () => { // eslint-disable-line @typescript-eslint/no-unused-vars
    //     return 'channelName';
    // };

    return (
        <TouchableOpacity
            onPress={openGallery}
            style={style.container}
        >
            <View style={style.iconContainer}>
                <FileIcon
                    file={fileInfo}
                    iconSize={48}
                />
            </View>
            <View style={style.textContainer}>
                <Text
                    style={style.nameText}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}
                >
                    {fileInfo.name}
                </Text>
                <View style={[style.flexRow]}>
                    <View style={{flexShrink: 1}}>
                        <Text
                            style={[style.infoText, style.channelText]}
                            numberOfLines={1}
                        >
                            {channelName}
                        </Text>
                    </View>
                    <View style={style.fileStatsContainer}>
                        <Text style={style.infoText}>{`${size} • `}</Text>
                        <FormattedDate
                            style={style.infoText}
                            format={format}
                            value={fileInfo.create_at as number}
                        />
                    </View>
                </View>
            </View>
            <TouchableOpacity
                onPress={handleThreeDotPress}
                style={style.threeDotContainer}
                hitSlop={hitSlop}
            >
                <CompassIcon
                    name='dots-horizontal'
                    color={changeOpacity(theme.centerChannelColor, 0.56)}
                    size={18}
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}
