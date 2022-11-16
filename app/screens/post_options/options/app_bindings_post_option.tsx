// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React, {useCallback, useMemo} from 'react';
import {map} from 'rxjs/operators';

import {postEphemeralCallResponseForPost} from '@actions/remote/apps';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {ChannelModel} from '@database/models/server';
import {useAppBinding} from '@hooks/apps';
import {dismissBottomSheet} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    bindings: AppBinding[];
    post: PostModel;
    serverUrl: string;
    teamId: string;
}

const AppBindingsPostOptions = ({serverUrl, post, teamId, bindings}: Props) => {
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
        await dismissBottomSheet(Screens.POST_OPTIONS);
        handleBindingSubmit(binding);
    }, [handleBindingSubmit]);

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
    const handlePress = useCallback(preventDoubleTap(() => {
        onPress(binding);
    }), [binding, onPress]);

    return (
        <OptionItem
            label={binding.label}
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

const withTeamId = withObservables(['post'], ({post}: OwnProps) => ({
    teamId: post.channel.observe().pipe(map((channel: ChannelModel) => channel.teamId)),
}));

export default React.memo(withTeamId(AppBindingsPostOptions));
