// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback} from 'react';

import {deleteSavedPost, savePostPreference} from '@actions/remote/preference';
import {Screens} from '@app/constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import BaseOption from './base_option';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

type CopyTextProps = {
    isSaved: boolean;
    postId: string;
}

const SaveOption = ({isSaved, postId}: CopyTextProps) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        const remoteAction = isSaved ? deleteSavedPost : savePostPreference;
        await remoteAction(serverUrl, postId);
        dismissBottomSheet(Screens.POST_OPTIONS);
    }, [postId, serverUrl]);

    const id = isSaved ? t('mobile.post_info.unsave') : t('mobile.post_info.save');
    const defaultMessage = isSaved ? 'Unsave' : 'Save';

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            iconName='bookmark-outline'
            onPress={onHandlePress}
            testID='post.options.flag.unflag'
        />
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUserId = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID);

    return {
        currentUserId,
    };
});

export default withDatabase(enhanced(SaveOption));
