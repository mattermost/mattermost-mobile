// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';
import {Platform} from 'react-native';

import {BaseOption} from '@components/common_post_options';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {dismissBottomSheet} from '@screens/navigation';
import {showSnackBar} from '@utils/snack_bar';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    sourceScreen: AvailableScreens;
    postMessage: string;
}

const messages = defineMessages({
    copyText: {
        id: 'mobile.post_info.copy_text',
        defaultMessage: 'Copy Text',
    },
});

const CopyTextOption = ({bottomSheetId, postMessage, sourceScreen}: Props) => {
    const handleCopyText = useCallback(async () => {
        Clipboard.setString(postMessage);
        await dismissBottomSheet(bottomSheetId);
        if ((Platform.OS === 'android' && Platform.Version < 33) || Platform.OS === 'ios') {
            showSnackBar({barType: SNACK_BAR_TYPE.MESSAGE_COPIED, sourceScreen});
        }
    }, [bottomSheetId, postMessage, sourceScreen]);

    return (
        <BaseOption
            message={messages.copyText}
            iconName='content-copy'
            onPress={handleCopyText}
            testID='post_options.copy_text.option'
        />
    );
};

export default CopyTextOption;
