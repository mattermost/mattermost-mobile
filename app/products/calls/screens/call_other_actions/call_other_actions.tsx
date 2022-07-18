// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {injectIntl} from 'react-intl';
import {View} from 'react-native';

import {dismissModal, goToScreen} from '@actions/navigation';
import SlideUpPanel from '@components/slide_up_panel';
import {THREAD} from '@constants/screen';

import Action from './action';

import type {Theme} from '@mm-redux/types/theme';

type Props = {
    theme: Theme;
    channelId?: string;
    rootId?: string;
}

const CallOtherActions = ({theme, channelId, rootId}: Props) => {
    const close = () => {
        dismissModal();
    };

    const chatThread = () => {
        goToScreen(THREAD, '', {channelId, rootId});
        return null;
    };

    return (
        <View style={{flex: 1}}>
            <SlideUpPanel
                onRequestClose={close}
                initialPosition={0.24}
                theme={theme}
            >
                <Action
                    destructive={false}
                    icon='message-text-outline'
                    onPress={chatThread}
                    text='Chat thread'
                    theme={theme}
                />
            </SlideUpPanel>
        </View>
    );
};

export default injectIntl(CallOtherActions);
