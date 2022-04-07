// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useCallback} from 'react';

import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';
import BaseOption from '@screens/post_options/options/base_option';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    team: TeamModel;
    threadId: string;
}
const CopyLinkOption = ({team, threadId}: Props) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        const permalink = `${serverUrl}/${team.name}/pl/${threadId}`;
        Clipboard.setString(permalink);
        dismissBottomSheet(Screens.THREAD_OPTIONS);
    }, [serverUrl, team, threadId]);

    return (
        <BaseOption
            i18nId={t('get_post_link_modal.title')}
            defaultMessage='Copy Link'
            iconName='link-variant'
            onPress={onHandlePress}
            testID='thread.options.copy_link'
        />
    );
};

export default CopyLinkOption;
