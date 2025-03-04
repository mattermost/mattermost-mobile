// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useMemo} from 'react';

import {postEphemeralCallResponseForChannel} from '@actions/remote/apps';
import OptionItem from '@components/option_item';
import {AppBindingLocations} from '@constants/apps';
import {useAppBinding} from '@hooks/apps';
import AppsManager from '@managers/apps_manager';
import {observeCurrentTeamId} from '@queries/servers/system';
import {preventDoubleTap} from '@utils/tap';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    channelId: string;
    teamId: string;
    serverUrl: string;
    bindings: AppBinding[];
    dismissChannelInfo: () => Promise<void>;
};

const ChannelInfoAppBindings = ({channelId, teamId, dismissChannelInfo, serverUrl, bindings}: Props) => {
    const onCallResponse = useCallback((callResp: AppCallResponse, message: string) => {
        postEphemeralCallResponseForChannel(serverUrl, callResp, message, channelId);
    }, [serverUrl, channelId]);

    const context = useMemo(() => ({
        channel_id: channelId,
        team_id: teamId,
    }), [channelId, teamId]);

    const config = useMemo(() => ({
        onSuccess: onCallResponse,
        onError: onCallResponse,
    }), [onCallResponse]);

    const handleBindingSubmit = useAppBinding(context, config);

    const onPress = useCallback(preventDoubleTap(async (binding: AppBinding) => {
        const submitPromise = handleBindingSubmit(binding);
        await dismissChannelInfo();

        const finish = await submitPromise;
        await finish();
    }), [handleBindingSubmit]);

    const options = bindings.map((binding) => (
        <BindingOptionItem
            key={(binding.app_id || '') + (binding.location || '')}
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
            label={binding.label || ''}
            icon={binding.icon}
            action={handlePress}
            type='default'
            testID={`channel_info.options.app_binding.option.${binding.location}`}
        />
    );
};

type OwnProps = {
    channelId: string;
    serverUrl: string;
}

const enhanced = withObservables([], (ownProps: WithDatabaseArgs & OwnProps) => {
    const {database} = ownProps;
    const teamId = observeCurrentTeamId(database);

    const bindings = AppsManager.observeBindings(ownProps.serverUrl, AppBindingLocations.CHANNEL_HEADER_ICON);

    return {
        teamId,
        bindings,
    };
});

export default React.memo(withDatabase(enhanced(ChannelInfoAppBindings)));
