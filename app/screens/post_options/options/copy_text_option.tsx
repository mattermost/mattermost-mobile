// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useCallback} from 'react';

import {Screens} from '@constants';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';
import {SNACK_BAR_TYPE} from '@screens/snack_bar/constants';
import {showToast} from '@utils/toast';

import BaseOption from './base_option';

type Props = {
    postMessage: string;
}
const CopyTextOption = ({postMessage}: Props) => {
    const handleCopyText = useCallback(() => {
        Clipboard.setString(postMessage);
        dismissBottomSheet(Screens.POST_OPTIONS);
        showToast(SNACK_BAR_TYPE.MESSAGE_COPIED);
    }, [postMessage]);

    return (
        <BaseOption
            i18nId={t('mobile.post_info.copy_text')}
            defaultMessage='Copy Text'
            iconName='content-copy'
            onPress={handleCopyText}
            testID='post.options.copy.text'
        />
    );
};

export default CopyTextOption;
