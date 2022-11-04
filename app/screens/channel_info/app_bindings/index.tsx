// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {combineLatest, of as of$} from 'rxjs';

import {handleBindingClick, postEphemeralCallResponseForChannel, postEphemeralCallResponseForPost} from '@actions/remote/apps';
import {handleGotoLocation} from '@actions/remote/command';
import OptionItem from '@app/components/option_item';
import {AppBindingLocations, AppCallResponseTypes} from '@app/constants/apps';
import {useServerUrl, withServerUrl} from '@app/context/server';
import {observeChannel} from '@app/queries/servers/channel';
import {observeCurrentChannelId, observeCurrentTeamId} from '@app/queries/servers/system';
import {createCallContext} from '@app/utils/apps';
import {preventDoubleTap} from '@app/utils/tap';

import AppsManager from '@managers/apps_manager';
import {WithDatabaseArgs} from '@typings/database/database';
import {showAppForm} from '@app/screens/navigation';

type Props = {
    channelId: string;
    teamId: string;
    serverUrl: string;
    bindings: AppBinding[];
    dismissChannelInfo: () => void;
};

const ChannelInfoAppBindings = ({channelId, teamId, dismissChannelInfo, serverUrl, bindings}: Props) => {
    const intl = useIntl();

    const tryOnPress = useCallback(async (binding: AppBinding) => {
        dismissChannelInfo();

        const context = createCallContext(
            binding.app_id,
            binding.location,
            channelId,
            teamId,
        );

        const res = await handleBindingClick(serverUrl, binding, context, intl);
        if (res.error) {
            const errorResponse = res.error;
            const errorMessage = errorResponse.text || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            postEphemeralCallResponseForChannel(serverUrl, errorResponse, errorMessage, channelId);
            return;
        }

        const callResp = res.data!;
        switch (callResp.type) {
            case AppCallResponseTypes.OK:
                if (callResp.text) {
                    postEphemeralCallResponseForChannel(serverUrl, callResp, callResp.text, channelId);
                }
                return;
            case AppCallResponseTypes.NAVIGATE:
                if (callResp.navigate_to_url) {
                    handleGotoLocation(serverUrl, intl, callResp.navigate_to_url);
                }
                return;
            case AppCallResponseTypes.FORM:
                if (callResp.form) {
                    showAppForm(callResp.form, context);
                }
                return;
            default: {
                const errorMessage = intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: callResp.type,
                });
                postEphemeralCallResponseForChannel(serverUrl, callResp, errorMessage, channelId);
            }
        }
    }, [channelId, teamId, dismissChannelInfo, serverUrl, bindings, intl]);

    const icon = ''; // TODO: Support icons

    const options = bindings.map((binding) => (
        <OptionItem
            key={binding.location}
            label={binding.label}
            icon={icon}
            action={preventDoubleTap(() => tryOnPress(binding))}
            type='default'
            testID={`channel_info.options.app_binding.option.${binding.location}`}
        />
    ));

    return <>{options}</>;
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
