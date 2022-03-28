// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import React, {useCallback} from 'react';

import {updateThreadFollow} from '@actions/remote/thread';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';
import BaseOption from '@screens/post_options/options/base_option';

type Props = {
    teamId: string;
    threadId: string;
}
const UnfollowThreadOption = ({teamId, threadId}: Props) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        updateThreadFollow(serverUrl, teamId, threadId, false);
        await dismissBottomSheet(Screens.THREAD_OPTIONS);
    }, [serverUrl, teamId, threadId]);

    return (
        <BaseOption
            i18nId={t('global_threads.options.unfollow')}
            defaultMessage='Unfollow Thread'
            iconName='message-minus-outline'
            onPress={onHandlePress}
            testID='thread.options.unfollow'
        />
    );
};

export default withDatabase(UnfollowThreadOption);
