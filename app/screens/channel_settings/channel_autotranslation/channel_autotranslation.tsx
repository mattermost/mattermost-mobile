// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';

import {setChannelAutotranslation} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {alertErrorWithFallback} from '@utils/draft';

type Props = {
    channelId: string;
    enabled: boolean;
    displayName: string;
}

const ChannelAutotranslation = ({channelId, displayName, enabled}: Props) => {
    const [autotranslation, setAutotranslation] = useState(enabled);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const toggleAutotranslation = usePreventDoubleTap(useCallback(async () => {
        setAutotranslation((v) => !v);
        const result = await setChannelAutotranslation(serverUrl, channelId, !enabled);
        if (result?.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                defineMessage({
                    id: 'channel_settings.channel_autotranslation_failed',
                    defaultMessage: 'An error occurred trying to enable automatic translation for channel {displayName}',
                }),
                {displayName},
            );
            setAutotranslation((v) => !v);
        }
    }, [channelId, displayName, enabled, intl, serverUrl]));

    return (
        <OptionItem
            action={toggleAutotranslation}
            label={intl.formatMessage({
                id: 'channel_settings.channel_autotranslation',
                defaultMessage: 'Auto-translation',
            })}
            description={intl.formatMessage({
                id: 'channel_settings.channel_autotranslation_description',
                defaultMessage: 'When enabled, channel members can turn on auto-translation to view messages in their preferred language.',
            })}
            icon='translate'
            type='toggle'
            selected={autotranslation}
            testID={`channel_settings.channel_autotranslation.option.toggled.${autotranslation}`}
        />
    );
};

export default ChannelAutotranslation;

