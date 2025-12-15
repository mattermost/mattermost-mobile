// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {setMyChannelAutotranslation} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {alertErrorWithFallback} from '@utils/draft';

type Props = {
    channelId: string;
    enabled: boolean;
    displayName: string;
    channelAutotranslationEnabled: boolean;
};

const MyAutotranslation = ({channelId, displayName, enabled, channelAutotranslationEnabled}: Props) => {
    // Use the local state for optimistic updates
    const [autotranslation, setAutotranslation] = useState(enabled);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const doToggleAutotranslation = useCallback(async () => {
        setAutotranslation((v) => !v);
        const result = await setMyChannelAutotranslation(serverUrl, channelId, !enabled);
        if (result?.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                defineMessage({
                    id: 'channel_info.my_autotranslation_failed',
                    defaultMessage: 'An error occurred trying to enable automatic translation for yourself in channel {displayName}',
                }),
                {displayName},
            );
            setAutotranslation((v) => !v);
        }
    }, [channelId, displayName, enabled, intl, serverUrl]);

    const toggleAutotranslation = usePreventDoubleTap(useCallback(async () => {
        if (autotranslation) {
            Alert.alert(
                intl.formatMessage({
                    id: 'channel_info.turn_off_auto_translation.title',
                    defaultMessage: 'Turn off auto-translation',
                }),
                intl.formatMessage({
                    id: 'channel_info.turn_off_auto_translation.description',
                    defaultMessage: 'Messages in this channel will revert to their original language. This will only affect how you see this channel. Other members won’t be affected.',
                }),
                [
                    {text: intl.formatMessage({id: 'channel_info.turn_off_auto_translation.button.cancel', defaultMessage: 'cancel'}), style: 'cancel'},
                    {text: intl.formatMessage({id: 'channel_info.turn_off_auto_translation.button.yes', defaultMessage: 'Yes, turn off'}), onPress: () => doToggleAutotranslation()},
                ],
            );
        } else {
            doToggleAutotranslation();
        }
    }, [autotranslation, doToggleAutotranslation, intl]));

    if (!channelAutotranslationEnabled) {
        return null;
    }

    const description = autotranslation ? intl.formatMessage({
        id: 'channel_info.my_autotranslation_enabled',
        defaultMessage: 'On ({language})',
    }, {
        language: intl.formatDisplayName(intl.locale, {type: 'language'}),
    }) : intl.formatMessage({
        id: 'channel_info.my_autotranslation_disabled',
        defaultMessage: 'Off',
    });

    return (
        <OptionItem
            action={toggleAutotranslation}
            label={intl.formatMessage({
                id: 'channel_info.my_autotranslation',
                defaultMessage: 'Auto-translation',
            })}
            description={description}
            icon='translate'
            type='toggle'
            selected={autotranslation}
            testID={`channel_info.options.my_autotranslation.option.toggled.${autotranslation}`}
        />
    );
};

export default MyAutotranslation;

