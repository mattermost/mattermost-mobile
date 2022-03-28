// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback} from 'react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {deleteSavedPost, savePostPreference} from '@actions/remote/preference';
import {Preferences, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {dismissBottomSheet} from '@screens/navigation';
import BaseOption from '@screens/post_options/options/base_option';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    isSaved: boolean;
    threadId: string;
}
const SaveOption = ({isSaved, threadId}: Props) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        const remoteAction = isSaved ? deleteSavedPost : savePostPreference;
        remoteAction(serverUrl, threadId);
        dismissBottomSheet(Screens.THREAD_OPTIONS);
    }, [threadId, serverUrl]);

    const id = isSaved ? t('mobile.post_info.unsave') : t('mobile.post_info.save');
    const defaultMessage = isSaved ? 'Unsave' : 'Save';

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            iconName='bookmark-outline'
            onPress={onHandlePress}
            testID='thread.options.save'
        />
    );
};

const enhanced = withObservables(['threadId'], ({threadId, database}: WithDatabaseArgs & {threadId: string}) => {
    return {
        isSaved: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SAVED_POST, threadId).observe().pipe(
            switchMap(
                (pref) => of$(Boolean(pref[0]?.value === 'true')),
            ),
        ),
    };
});

export default withDatabase(enhanced(SaveOption));
