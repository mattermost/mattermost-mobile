// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {t} from '@utils/i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/preferences';

type PreHeaderProps = {
    isConsecutivePost?: boolean;
    isFlagged?: boolean;
    isPinned: boolean;
    skipFlaggedHeader?: boolean;
    skipPinnedHeader?: boolean;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            height: 15,
            marginLeft: 10,
            marginRight: 10,
            marginTop: 10,
        },
        consecutive: {
            marginBottom: 3,
        },
        iconsContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginRight: 10,
            width: 35,
        },
        icon: {
            color: theme.linkColor,
        },
        iconsSeparator: {
            marginRight: 5,
        },
        rightColumn: {
            flex: 1,
            flexDirection: 'column',
            marginLeft: 2,
        },
        text: {
            color: theme.linkColor,
            fontSize: 13,
            lineHeight: 15,
        },
    };
});

const PreHeader = ({isConsecutivePost, isFlagged, isPinned, skipFlaggedHeader, skipPinnedHeader, theme}: PreHeaderProps) => {
    const style = getStyleSheet(theme);
    const isPinnedAndFlagged = isPinned && isFlagged && !skipFlaggedHeader && !skipPinnedHeader;

    let text;
    if (isPinnedAndFlagged) {
        text = {
            id: t('mobile.post_pre_header.pinned_flagged'),
            defaultMessage: 'Pinned and Saved',
        };
    } else if (isPinned && !skipPinnedHeader) {
        text = {
            id: t('mobile.post_pre_header.pinned'),
            defaultMessage: 'Pinned',
        };
    } else if (isFlagged && !skipFlaggedHeader) {
        text = {
            id: t('mobile.post_pre_header.flagged'),
            defaultMessage: 'Saved',
        };
    }

    if (!text) {
        return null;
    }

    return (
        <View style={[style.container, (isConsecutivePost && style.consecutive)]}>
            <View style={style.iconsContainer}>
                {isPinned && !skipPinnedHeader &&
                <CompassIcon
                    name='pin-outline'
                    size={14}
                    style={style.icon}
                />
                }
                {isPinnedAndFlagged &&
                <View style={style.iconsSeparator}/>
                }
                {isFlagged && !skipFlaggedHeader &&
                <CompassIcon
                    name='bookmark-outline'
                    size={14}
                    style={style.icon}
                />
                }
            </View>
            <View style={style.rightColumn}>
                <FormattedText
                    {...text}
                    style={style.text}
                    testID='post_pre_header.text'
                />
            </View>
        </View>
    );
};

export default PreHeader;
