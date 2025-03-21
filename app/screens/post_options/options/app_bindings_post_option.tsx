// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useMemo} from 'react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {postEphemeralCallResponseForPost} from '@actions/remote/apps';
import OptionItem from '@components/option_item';
import {useAppBinding} from '@hooks/apps';
import {usePreventDoubleTap} from '@hooks/utils';
import {observeChannel} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';
import {dismissBottomSheet} from '@screens/navigation';
import {isSystemMessage} from '@utils/post';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    bindings: AppBinding[];
    post: PostModel;
    serverUrl: string;
    teamId: string;
}

const AppBindingsPostOptions = ({bottomSheetId, serverUrl, post, teamId, bindings}: Props) => {
    const onCallResponse = useCallback((callResp: AppCallResponse, message: string) => {
        postEphemeralCallResponseForPost(serverUrl, callResp, message, post);
    }, [serverUrl, post]);

    const context = useMemo(() => ({
        channel_id: post.channelId,
        team_id: teamId,
        post_id: post.id,
        root_id: post.rootId || post.id,
    }), [post, teamId]);

    const config = useMemo(() => ({
        onSuccess: onCallResponse,
        onError: onCallResponse,
    }), [onCallResponse]);

    const handleBindingSubmit = useAppBinding(context, config);

    const onPress = useCallback(async (binding: AppBinding) => {
        const submitPromise = handleBindingSubmit(binding);
        await dismissBottomSheet(bottomSheetId);

        const finish = await submitPromise;
        await finish();
    }, [bottomSheetId, handleBindingSubmit]);

    if (isSystemMessage(post)) {
        return null;
    }

    const options = bindings.map((binding) => (
        <BindingOptionItem
            key={binding.location}
            binding={binding}
            onPress={onPress}
        />
    ));

    return <>{options}</>;
};

const BindingOptionItem = ({binding, onPress}: {binding: AppBinding; onPress: (binding: AppBinding) => void}) => {
    const handlePress = usePreventDoubleTap(useCallback(() => {
        onPress(binding);
    }, [binding, onPress]));

    return (
        <OptionItem
            label={binding.label || ''}
            icon={binding.icon}
            action={handlePress}
            type='default'
            testID={`post_options.app_binding.option.${binding.location}`}
        />
    );
};

type OwnProps = {
    post: PostModel;
    bindings: AppBinding[];
}

const withTeamId = withObservables(['post'], ({database, post}: WithDatabaseArgs & OwnProps) => ({
    teamId: post.channelId ? observeChannel(database, post.channelId).pipe(
        switchMap((c) => (c?.teamId ? of$(c.teamId) : observeCurrentTeamId(database))),
        distinctUntilChanged(),
    ) : of$(''),
}));

export default React.memo(withDatabase(withTeamId(AppBindingsPostOptions)));
