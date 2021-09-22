// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {View} from 'react-native';

import {dismissModal} from '@actions/navigation';
import SlideUpPanel from '@components/slide_up_panel';

import Action from './action';

import type {Theme} from '@mm-redux/types/theme';

type Props = {
    theme: Theme;
    intl: typeof intlShape;
}

const VoiceCallOtherActions = ({theme, intl}: Props) => {
    const close = () => {
        dismissModal();
    };

    return (
        <View style={{flex: 1}}>
            <SlideUpPanel
                onRequestClose={close}
                initialPosition={0.30}
                theme={theme}
            >
                <Action
                    destructive={false}
                    icon='account-plus-outline'
                    onPress={() => null}
                    text={intl.formatMessage({id: 'voice_call.add_participants', defaultMessage: 'Add participants'})}
                    theme={theme}
                />
                <Action
                    destructive={false}
                    icon='link-variant'
                    onPress={() => null}
                    text={intl.formatMessage({id: 'voice_call.copy_call_link', defaultMessage: 'Copy call link'})}
                    theme={theme}
                />
                <Action
                    destructive={false}
                    icon='settings-outline'
                    onPress={() => null}
                    text={intl.formatMessage({id: 'voice_call.call_settings', defaultMessage: 'Call Settings'})}
                    theme={theme}
                />
                <Action
                    destructive={false}
                    icon='send-outline'
                    onPress={() => null}
                    text={intl.formatMessage({id: 'voice_call.give_feedback', defaultMessage: 'Give Feedback'})}
                    theme={theme}
                />
            </SlideUpPanel>
        </View>
    );
};

export default injectIntl(VoiceCallOtherActions);
