// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';

type PreHeaderProps = {
    isConsecutivePost?: boolean;
    isSaved?: boolean;
    isPinned: boolean;
    skipSavedHeader?: boolean;
    skipPinnedHeader?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            height: 15,
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

const PreHeader = ({isConsecutivePost, isSaved, isPinned, skipSavedHeader, skipPinnedHeader}: PreHeaderProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isPinnedAndSaved = isPinned && isSaved && !skipSavedHeader && !skipPinnedHeader;

    let text;
    if (isPinnedAndSaved) {
        text = {
            id: t('mobile.post_pre_header.pinned_saved'),
            defaultMessage: 'Pinned and Saved',
        };
    } else if (isPinned && !skipPinnedHeader) {
        text = {
            id: t('mobile.post_pre_header.pinned'),
            defaultMessage: 'Pinned',
        };
    } else if (isSaved && !skipSavedHeader) {
        text = {
            id: t('mobile.post_pre_header.saved'),
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
                    name='pin'
                    size={14}
                    style={style.icon}
                />
                }
                {isPinnedAndSaved &&
                <View style={style.iconsSeparator}/>
                }
                {isSaved && !skipSavedHeader &&
                <CompassIcon
                    name='bookmark'
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
