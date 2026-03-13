// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Platform} from 'react-native';

import {fetchChannelSharedRemotes} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {goToScreen} from '@screens/navigation';

const messages = defineMessages({
    loading: {
        id: 'channel_settings.share_with_connected_workspaces_loading',
        defaultMessage: 'Loading…',
    },
    loadError: {
        id: 'channel_settings.share_with_connected_workspaces_load_error',
        defaultMessage: 'Could not load connection count',
    },
});

type Props = {
    channelId: string;
    isChannelShared: boolean;

    /** Increment when returning from Channel Share so we refetch the count (no WebSocket for shared remotes). */
    refreshTrigger?: number;
}

const ShareWithConnectedWorkspaces = ({channelId, isChannelShared, refreshTrigger = 0}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const [sharedCount, setSharedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError(false);
        const run = async () => {
            const result = await fetchChannelSharedRemotes(serverUrl, channelId);
            if (cancelled) {
                return;
            }
            setLoading(false);
            if (result.error) {
                setSharedCount(0);
                setLoadError(true);
                return;
            }
            setSharedCount(result.remotes?.length ?? 0);
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [channelId, serverUrl, refreshTrigger]);

    const goToShareScreen = usePreventDoubleTap(useCallback(() => {
        const title = formatMessage({
            id: 'channel_settings.share_with_connected_workspaces',
            defaultMessage: 'Share with connected workspaces',
        });
        goToScreen(Screens.CHANNEL_SHARE, title, {channelId});
    }, [channelId, formatMessage]));

    let description: string | undefined;
    if (loading) {
        description = formatMessage(messages.loading);
    } else if (loadError) {
        description = formatMessage(messages.loadError);
    } else if (isChannelShared && sharedCount > 0) {
        description = formatMessage(
            {
                id: 'channel_settings.shared_with_connections',
                defaultMessage: 'Shared with {count, plural, one {# connection} other {# connections}}',
            },
            {count: sharedCount},
        );
    }

    let info: string | undefined;
    if (isChannelShared && sharedCount > 0 && !loading && !loadError) {
        info = formatMessage({id: 'channel_settings.share_on', defaultMessage: 'On'});
    } else {
        info = formatMessage({id: 'channel_settings.share_off', defaultMessage: 'Off'});
    }

    return (
        <OptionItem
            action={goToShareScreen}
            label={formatMessage({
                id: 'channel_settings.share_with_connected_workspaces',
                defaultMessage: 'Share with connected workspaces',
            })}
            description={description}
            disabled={loading}
            icon='circle-multiple-outline'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            testID='channel_settings.share_with_connected_workspaces.option'
            info={info}
        />
    );
};

export default ShareWithConnectedWorkspaces;
