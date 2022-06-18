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
}

const format = 'MMM DD HH:MM A';
const hitSlop = {top: 24, bottom: 24, left: 24, right: 24};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',

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
        flexColumn: {flexDirection: 'column'},
        flexRow: {flexDirection: 'row'},
        iconContainer: {
            marginHorizontal: 8,
        },
        nameText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 200, 'SemiBold'),
        },
        infoText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
        channelText: {
            marginRight: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
            paddingHorizontal: 4,
        },
        dateText: {
            marginBottom: 2,
        },
        threeDotContainer: {
            flex: 1,
            alignItems: 'flex-end',
        },
        threeDot: {
            top: 13,
            right: 20,
        },
    };
});

export default function FileCard({fileInfo}: Props) {
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
    const channelName = () => { // eslint-disable-line @typescript-eslint/no-unused-vars
        return 'channelName';
    };

    // TODO: Get the filetype and display
    const fileType = () => { // eslint-disable-line @typescript-eslint/no-unused-vars
        return 'fileType';
    };

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
            <View style={style.flexColumn}>
                <Text style={style.nameText}>{fileInfo.name}</Text>
                <View style={style.flexRow}>
                    {/* <Text style={[style.infoText, style.channelText]}>{channelName()}</Text> */}
                    {/* <Text style={style.infoText}>{fileType()}</Text> */}
                    <Text style={style.infoText}>{`${size} • `}</Text>
                    <FormattedDate
                        style={[style.infoText, style.dateText]}
                        format={format}
                        value={fileInfo.create_at as number}
                    />
                </View>
            </View>
            <View style={style.threeDotContainer}>
                <TouchableOpacity
                    onPress={handleThreeDotPress}
                    hitSlop={hitSlop}
                >
                    <CompassIcon
                        name='dots-horizontal'
                        color={changeOpacity(theme.centerChannelColor, 0.56)}
                        style={style.threeDot}
                        size={18}
                    />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}
