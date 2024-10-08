// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Pressable} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import {Screens} from '@app/constants';
import {ICON_SIZE} from '@app/constants/post_draft';
import {useTheme} from '@app/context/theme';
import {openAsBottomSheet} from '@app/screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';

import type {AttachmentOptionsProps} from './attachment_options.types';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        iconContainer: {
            display: 'flex',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 20,
            alignItems: 'center',
            alignSelf: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
        },
        icon: {
            alignSelf: 'center',
        },
    };
});

const AttachmentOptions: React.FC<AttachmentOptionsProps> = (
    {
        canUploadFiles,
        fileCount,
        maxFilesReached,
        maxFileCount,
        onUploadFiles,
        testID,
    },
) => {
    const theme = useTheme();
    const iconColor = changeOpacity(theme.centerChannelColor, 0.64);
    const style = getStyleSheet(theme);
    const {formatMessage} = useIntl();

    const handleOpenButtonSheet = useCallback(() => {
        Keyboard.dismiss();
        openAsBottomSheet({
            closeButtonId: 'close-add-reaction',
            screen: Screens.QUICK_ACTIONS,
            theme,
            title: formatMessage({id: 'attachment_option.header', defaultMessage: 'Files and media'}),
            props: {
                onUploadFiles,
                maxFilesReached,
                canUploadFiles,
                testID,
                fileCount,
                maxFileCount,
            },
        });
    }, [
        onUploadFiles,
        maxFilesReached,
        canUploadFiles,
        testID,
        fileCount,
        maxFileCount,
        theme,
        formatMessage,
    ]);

    return (
        <Pressable
            onPress={handleOpenButtonSheet}
            style={style.iconContainer}
        >
            <CompassIcon
                name='plus'
                size={ICON_SIZE}
                color={iconColor}
                style={style.icon}
            />
        </Pressable>);
};

export default AttachmentOptions;
