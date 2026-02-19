// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {dismissBottomSheet, goToScreen} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    postId: string;
}

const messages = defineMessages({
    showTranslation: {
        id: 'mobile.post_info.show_translation',
        defaultMessage: 'Show Translation',
    },
});

const ShowTranslationOption = ({bottomSheetId, postId}: Props) => {
    const intl = useIntl();
    const onHandlePress = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);
        goToScreen(Screens.SHOW_TRANSLATION, intl.formatMessage(messages.showTranslation), {postId});
    }, [bottomSheetId, intl, postId]);

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
