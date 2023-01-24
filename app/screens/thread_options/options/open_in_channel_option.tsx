// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {showPermalink} from '@actions/remote/permalink';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    threadId: string;
}
const OpenInChannelOption = ({bottomSheetId, threadId}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);
        showPermalink(serverUrl, '', threadId);
    }, [bottomSheetId, intl, serverUrl, threadId]);

    return (
        <BaseOption
            i18nId={t('global_threads.options.open_in_channel')}
            defaultMessage='Open in Channel'
            iconName='globe'
            onPress={onHandlePress}
            testID='thread_options.open_in_channel.option'
        />
    );
};

export default OpenInChannelOption;
