// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {injectIntl} from 'react-intl';
import {View} from 'react-native';

import {dismissModal} from '@actions/navigation';
import SlideUpPanel from '@components/slide_up_panel';

import Action from './action';

import type {Theme} from '@mm-redux/types/theme';

type Props = {
    theme: Theme;
}

const CallOtherActions = ({theme}: Props) => {
    const close = () => {
        dismissModal();
    };

    // TODO: Implement this whenever we support participants invitation to calls
    const addParticipants = useCallback(() => null, []);

    // TODO: Implement this whenever we support calls links
    const copyCallLink = useCallback(() => null, []);

    // TODO: Implement this whenever we support give feedback
    const giveFeedback = useCallback(() => null, []);

    return (
        <View style={{flex: 1}}>
            <SlideUpPanel
                onRequestClose={close}
                initialPosition={0.24}
                theme={theme}
            >
                <Action
                    destructive={false}
                    icon='account-plus-outline'
                    onPress={addParticipants}
                    text='Add participants'
                    theme={theme}
                />
                <Action
                    destructive={false}
                    icon='link-variant'
                    onPress={copyCallLink}
                    text='Copy call link'
                    theme={theme}
                />
                <Action
                    destructive={false}
                    icon='send-outline'
                    onPress={giveFeedback}
                    text='Give Feedback'
                    theme={theme}
                />
            </SlideUpPanel>
        </View>
    );
};

export default injectIntl(CallOtherActions);
