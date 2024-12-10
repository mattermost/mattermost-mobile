// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import FormattedDate, {type FormattedDateFormat} from '@components/formatted_date';
import {useTheme} from '@context/theme';
import {getFormattedFileSize} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type FileInfoProps = {
    disabled?: boolean;
    file: FileInfo;
    showDate: boolean;
    channelName?: string;
    onPress: () => void;
};
const FORMAT: FormattedDateFormat = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        attachmentContainer: {
            flex: 1,
            justifyContent: 'center',
        },
        fileDownloadContainer: {
            flexDirection: 'row',
            marginTop: 3,
        },
        fileStatsContainer: {
            flexGrow: 1,
            flexDirection: 'row',
        },
        infoText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
        fileName: {
            marginTop: -4,
            flexDirection: 'column',
            flexWrap: 'wrap',
            color: theme.centerChannelColor,
            paddingRight: 10,
            ...typography('Body', 200, 'SemiBold'),
        },
        channelWrapper: {
            flexShrink: 1,
            marginRight: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            paddingHorizontal: 4,
            borderRadius: 4,
        },
        channelText: {
            ...typography('Body', 50, 'SemiBold'),
            color: changeOpacity(theme.centerChannelColor, 0.72),
        },
    };
});

const FileInfo = ({disabled, file, channelName, showDate, onPress}: FileInfoProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.attachmentContainer}>
            <TouchableOpacity
                disabled={disabled}
                onPress={onPress}
            >
                <Text
                    numberOfLines={1}
                    ellipsizeMode='tail'
                    style={style.fileName}
                >
                    {file.name.trim()}
                </Text>
                <View style={style.fileDownloadContainer}>
                    {channelName &&
                        <View style={style.channelWrapper}>
                            <Text
                                style={style.channelText}
                                numberOfLines={1}
                            >
                                {channelName}
                            </Text>
                        </View>
                    }
                    <View style={style.fileStatsContainer}>
                        <Text style={style.infoText}>
                            {`${getFormattedFileSize(file.size)}`}
                        </Text>
                        {showDate && file.create_at != null && (
                            <>
                                <Text style={style.infoText}>
                                    {' • '}
                                </Text>
                                <FormattedDate
                                    style={style.infoText}
                                    format={FORMAT}
                                    value={file.create_at}
                                />
                            </>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default FileInfo;
