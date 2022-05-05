// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useCallback} from 'react';

import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

type Props = {
    postMessage: string;
}
const CopyTextOption = ({postMessage}: Props) => {
    const handleCopyText = useCallback(async () => {
        await dismissBottomSheet(Screens.POST_OPTIONS);
        Clipboard.setString(postMessage);
    }, [postMessage]);

    return (
        <BaseOption
            i18nId={t('mobile.post_info.copy_text')}
            defaultMessage='Copy Text'
            iconName='content-copy'
            onPress={handleCopyText}
            testID='post_options.copy.text.option'
        />
    );
};

export default CopyTextOption;
