// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {dismissBottomSheet, navigateToScreen} from '@screens/navigation';

type Props = {
    postId: string;
}

const messages = defineMessages({
    showTranslation: {
        id: 'mobile.post_info.show_translation',
        defaultMessage: 'Show Translation',
    },
});

const ShowTranslationOption = ({postId}: Props) => {
    const onHandlePress = useCallback(async () => {
        await dismissBottomSheet();
        navigateToScreen(Screens.SHOW_TRANSLATION, {postId});
    }, [postId]);

    return (
        <BaseOption
            message={messages.showTranslation}
            iconName='translate'
            onPress={onHandlePress}
            testID='post_options.show_translation.option'
        />
    );
};

export default ShowTranslationOption;
