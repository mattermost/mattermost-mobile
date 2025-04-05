// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useMemo, useState} from 'react';
import {map} from 'rxjs/operators';

import {postEphemeralCallResponseForPost} from '@actions/remote/apps';
import AutocompleteSelector from '@components/autocomplete_selector';
import {useServerUrl} from '@context/server';
import {useAppBinding} from '@hooks/apps';
import {observeChannel} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';
import {logDebug} from '@utils/log';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    binding: AppBinding;
    currentTeamId: string;
    post: PostModel;
    teamID?: string;
    location: AvailableScreens;
}

const MenuBinding = ({
    binding,
    currentTeamId,
    post,
    teamID,
    location,
}: Props) => {
    const [selected, setSelected] = useState<string>();
    const serverUrl = useServerUrl();

    const onCallResponse = useCallback((callResp: AppCallResponse, message: string) => {
        postEphemeralCallResponseForPost(serverUrl, callResp, message, post);
    }, [serverUrl, post]);

    const context = useMemo(() => ({
        channel_id: post.channelId,
        team_id: teamID || currentTeamId,
        post_id: post.id,
        root_id: post.rootId || post.id,
    }), [post, teamID, currentTeamId]);

    const config = useMemo(() => ({
        onSuccess: onCallResponse,
        onError: onCallResponse,
    }), [onCallResponse]);

    const handleBindingSubmit = useAppBinding(context, config);

    const onSelect = useCallback(async (picked: SelectedDialogOption) => {
        if (!picked || Array.isArray(picked)) {
            return;
        }
        setSelected(picked.value);

        const bind = binding.bindings?.find((b) => b.location === picked.value);
        if (!bind) {
            logDebug('Trying to select element not present in binding.');
            return;
        }

        const finish = await handleBindingSubmit(bind);
        finish();
    }, [handleBindingSubmit, binding.bindings]);

    const options = useMemo(() => binding.bindings?.map<DialogOption>((b: AppBinding) => ({
        text: b.label || '',
        value: b.location || '',
    })), [binding.bindings]);

    return (
        <AutocompleteSelector
            placeholder={binding.label}
            options={options}
            selected={selected}
            onSelected={onSelect}
            testID={`embedded_binding.${binding.location}`}
            location={location}
        />
    );
};

const withTeamId = withObservables(['post'], ({post, database}: {post: PostModel} & WithDatabaseArgs) => ({
    teamID: observeChannel(database, post.channelId).pipe(map((channel) => channel?.teamId)),
    currentTeamId: observeCurrentTeamId(database),
}));

export default withDatabase(withTeamId(MenuBinding));
