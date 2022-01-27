// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {map} from 'rxjs/operators';

import {doAppCall, postEphemeralCallResponseForPost} from '@actions/remote/apps';
import AutocompleteSelector from '@components/autocomplete_selector';
import {AppExpandLevels, AppBindingLocations, AppCallTypes, AppCallResponseTypes} from '@constants/apps';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server';
import {createCallContext, createCallRequest} from '@utils/apps';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';

type Props = {
    binding: AppBinding;
    currentTeamId: string;
    post: PostModel;
    teamID?: string;
    theme: Theme;
}

const {SERVER: {SYSTEM}} = MM_TABLES;

const MenuBinding = ({binding, currentTeamId, post, teamID, theme}: Props) => {
    const [selected, setSelected] = useState<PostActionOption>();
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onSelect = useCallback(async (picked?: PostActionOption) => {
        if (!picked) {
            return;
        }
        setSelected(picked);

        const bind = binding.bindings?.find((b) => b.location === picked.value);
        if (!bind) {
            console.debug('Trying to select element not present in binding.'); //eslint-disable-line no-console
            return;
        }

        if (!bind.call) {
            return;
        }

        const context = createCallContext(
            bind.app_id,
            AppBindingLocations.IN_POST + bind.location,
            post.channelId,
            teamID || currentTeamId,
            post.id,
        );

        const call = createCallRequest(
            bind.call,
            context,
            {post: AppExpandLevels.EXPAND_ALL},
        );

        const res = await doAppCall(serverUrl, call, AppCallTypes.SUBMIT, intl, theme);
        if (res.error) {
            const errorResponse = res.error as AppCallResponse<unknown>;
            const errorMessage = errorResponse.error || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            postEphemeralCallResponseForPost(serverUrl, errorResponse, errorMessage, post);
            return;
        }

        const callResp = res.data!;
        switch (callResp.type) {
            case AppCallResponseTypes.OK:
                if (callResp.markdown) {
                    postEphemeralCallResponseForPost(serverUrl, callResp, callResp.markdown, post);
                }
                return;
            case AppCallResponseTypes.NAVIGATE:
            case AppCallResponseTypes.FORM:
                return;
            default: {
                const errorMessage = intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: callResp.type,
                });
                postEphemeralCallResponseForPost(serverUrl, callResp, errorMessage, post);
            }
        }
    }, []);

    const options = binding.bindings?.map<PostActionOption>((b: AppBinding) => ({text: b.label, value: b.location || ''}));

    return (
        <AutocompleteSelector
            placeholder={binding.label}
            options={options}
            selected={selected}
            onSelected={onSelect}
        />
    );
};

const withTeamId = withObservables(['post'], ({post}: {post: PostModel}) => ({
    teamID: post.channel.observe().pipe(map((channel: ChannelModel) => channel.teamId)),
    currentTeamId: post.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        map(({value}) => value),
    ),
}));

export default withTeamId(MenuBinding);
