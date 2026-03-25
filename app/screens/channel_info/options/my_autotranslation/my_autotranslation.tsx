// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {setMyChannelAutotranslation} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {alertErrorWithFallback} from '@utils/draft';

const messages = defineMessages({
    label: {
        id: 'channel_info.my_autotranslation',
        defaultMessage: 'Auto-translation',
    },
    failed: {
        id: 'channel_info.my_autotranslation_failed',
        defaultMessage: 'An error occurred trying to enable automatic translation for yourself in channel {displayName}',
    },
    languageNotSupported: {
        id: 'channel_info.my_autotranslation_language_not_supported',
        defaultMessage: 'Your language is not supported',
    },
    enabled: {
        id: 'channel_info.my_autotranslation_enabled',
        defaultMessage: 'On ({language})',
    },
    disabled: {
        id: 'channel_info.my_autotranslation_disabled',
        defaultMessage: 'Off',
    },
    turnOffTitle: {
        id: 'channel_info.turn_off_auto_translation.title',
        defaultMessage: 'Turn off auto-translation',
    },
    turnOffDescription: {
        id: 'channel_info.turn_off_auto_translation.description',
        defaultMessage: "Messages in this channel will revert to their original language. This will only affect how you see this channel. Other members won't be affected.",
    },
    turnOffCancel: {
        id: 'channel_info.turn_off_auto_translation.button.cancel',
        defaultMessage: 'cancel',
    },
    turnOffYes: {
        id: 'channel_info.turn_off_auto_translation.button.yes',
        defaultMessage: 'Yes, turn off',
    },
});

type Props = {
    channelId: string;
    enabled: boolean;
    displayName: string;
    isLanguageSupported: boolean;
};

const MyAutotranslation = ({channelId, displayName, enabled, isLanguageSupported}: Props) => {
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
                messages.failed,
                {displayName},
            );
            setAutotranslation((v) => !v);
        }
    }, [channelId, displayName, enabled, intl, serverUrl]);

    const toggleAutotranslation = usePreventDoubleTap(useCallback(async () => {
        if (autotranslation) {
            Alert.alert(
                intl.formatMessage(messages.turnOffTitle),
                intl.formatMessage(messages.turnOffDescription),
                [
                    {text: intl.formatMessage(messages.turnOffCancel), style: 'cancel'},
                    {text: intl.formatMessage(messages.turnOffYes), onPress: () => doToggleAutotranslation()},
                ],
            );
        } else {
            doToggleAutotranslation();
        }
    }, [autotranslation, doToggleAutotranslation, intl]));

    if (!isLanguageSupported) {
        return (
            <OptionItem
                label={intl.formatMessage(messages.label)}
                description={intl.formatMessage(messages.languageNotSupported)}
                icon='translate'
                type='none'
                disabled={true}
                testID='channel_info.options.my_autotranslation.option'
            />
        );
    }

    const description = autotranslation ? intl.formatMessage(messages.enabled, {
        language: intl.formatDisplayName(intl.locale, {type: 'language'}),
    }) : intl.formatMessage(messages.disabled);

    return (
        <OptionItem
            action={toggleAutotranslation}
            label={intl.formatMessage(messages.label)}
            description={description}
            icon='translate'
            type='toggle'
            selected={autotranslation}
            testID={`channel_info.options.my_autotranslation.option.toggled.${autotranslation}`}
        />
    );
};

export default MyAutotranslation;

