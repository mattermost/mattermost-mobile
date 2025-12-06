// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {dismissBottomSheet, goToScreen} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type ViewTranslationProps = {
    bottomSheetId: AvailableScreens;
    postId: string;
}

const messages = defineMessages({
    viewTranslation: {
        id: 'mobile.post_info.view_translation',
        defaultMessage: 'View Translation',
    },
});

const ViewTranslationOption = ({bottomSheetId, postId}: ViewTranslationProps) => {
    const onHandlePress = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);
        goToScreen(Screens.VIEW_TRANSLATION, 'View Translation', {postId});
    }, [bottomSheetId, postId]);

    return (
        <BaseOption
            message={messages.viewTranslation}
            iconName='globe'
            onPress={onHandlePress}
            testID='post_options.view_translation.option'
        />
    );
};

export default ViewTranslationOption;
