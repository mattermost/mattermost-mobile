// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View, Text} from 'react-native';

import FormattedDate, {type FormattedDateFormat} from '@components/formatted_date';
import {useTheme} from '@context/theme';
import {getFormattedFileSize} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Icon, {ICON_SIZE} from './icon';

const FORMAT: FormattedDateFormat = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
};

const HEADER_MARGIN = 8;
const FILE_ICON_MARGIN = 8;
const INFO_MARGIN = 8;
export const HEADER_HEIGHT = HEADER_MARGIN +
    ICON_SIZE +
    FILE_ICON_MARGIN +
    (28 * 2) + //400 line height times two lines
    (INFO_MARGIN * 2) +
    24; // 200 line height

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        headerContainer: {
            marginBottom: HEADER_MARGIN,
        },
        fileIconContainer: {
            marginBottom: FILE_ICON_MARGIN,
            alignSelf: 'flex-start',
        },
        nameText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 400, 'SemiBold'),
        },
        infoContainer: {
            marginVertical: INFO_MARGIN,
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
    };
});

type Props = {
    fileInfo: FileInfo;
}
const Header = ({fileInfo}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const size = getFormattedFileSize(fileInfo.size);

    return (
        <View style={style.headerContainer}>
            <View style={style.fileIconContainer}>
                <Icon fileInfo={fileInfo}/>
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
                    format={FORMAT}
                    value={fileInfo.create_at as number}
                />
            </View>
        </View>
    );
};

export default Header;
