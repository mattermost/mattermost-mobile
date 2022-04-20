// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useCallback} from 'react';

import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';
import {showSnackBar} from '@utils/snack_bar';

type Props = {
    location: typeof Screens[keyof typeof Screens];
    postMessage: string;
}
const CopyTextOption = ({postMessage, location}: Props) => {
    const handleCopyText = useCallback(async () => {
        Clipboard.setString(postMessage);
        await dismissBottomSheet(Screens.POST_OPTIONS);
        showSnackBar({barType: SNACK_BAR_TYPE.MESSAGE_COPIED, location});
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
