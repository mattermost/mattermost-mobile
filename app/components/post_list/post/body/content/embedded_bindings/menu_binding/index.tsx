// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {map} from 'rxjs/operators';

import {handleBindingClick, postEphemeralCallResponseForPost} from '@actions/remote/apps';
import AutocompleteSelector from '@components/autocomplete_selector';
import {AppBindingLocations, AppCallResponseTypes} from '@constants/apps';
import {useServerUrl} from '@context/server';
import {observeCurrentTeamId} from '@queries/servers/system';
import {createCallContext} from '@utils/apps';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    binding: AppBinding;
    currentTeamId: string;
    post: PostModel;
    teamID?: string;
}

const MenuBinding = ({binding, currentTeamId, post, teamID}: Props) => {
    const [selected, setSelected] = useState<string>();
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onSelect = useCallback(async (picked?: string | string[]) => {
        if (!picked || Array.isArray(picked)) { // We are sure AutocompleteSelector only returns one, since it is not multiselect.
            return;
        }
        setSelected(picked);

        const bind = binding.bindings?.find((b) => b.location === picked);
        if (!bind) {
            console.debug('Trying to select element not present in binding.'); //eslint-disable-line no-console
            return;
        }

        const context = createCallContext(
            bind.app_id,
            AppBindingLocations.IN_POST + bind.location,
            post.channelId,
            teamID || currentTeamId,
            post.id,
        );

        const res = await handleBindingClick(serverUrl, bind, context, intl);
        if (res.error) {
            const errorResponse = res.error;
            const errorMessage = errorResponse.text || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            postEphemeralCallResponseForPost(serverUrl, errorResponse, errorMessage, post);
            return;
        }

        const callResp = res.data!;
        switch (callResp.type) {
            case AppCallResponseTypes.OK:
                if (callResp.text) {
                    postEphemeralCallResponseForPost(serverUrl, callResp, callResp.text, post);
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
            testID={`embedded_binding.${binding.location}`}
        />
    );
};

const withTeamId = withObservables(['post'], ({post}: {post: PostModel}) => ({
    teamID: post.channel.observe().pipe(map((channel: ChannelModel) => channel.teamId)),
    currentTeamId: observeCurrentTeamId(post.database),
}));

export default withTeamId(MenuBinding);
