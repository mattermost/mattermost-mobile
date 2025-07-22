// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {goToPlaybookRuns} from '@playbooks/screens/navigation';
import {dismissBottomSheet} from '@screens/navigation';

type Props = {
    channelId: string;
    playbooksActiveRuns: number;
    channelName: string;
    location: 'channel_actions' | 'quick_actions';
}

const messages = defineMessages({
    playbookRuns: {
        id: 'playbooks.playbooks_runs.title',
        defaultMessage: 'Playbook runs',
    },
});

const PlaybookRunsOption = ({
    channelId,
    playbooksActiveRuns,
    channelName,
    location,
}: Props) => {
    const intl = useIntl();

    const onPress = useCallback(async () => {
        await dismissBottomSheet();
        goToPlaybookRuns(intl, channelId, channelName);
    }, [intl, channelId, channelName]);

    if (location === 'quick_actions') {
        return (
            <SlideUpPanelItem
                onPress={onPress}
                text={intl.formatMessage(messages.playbookRuns)}
                leftIcon='product-playbooks'
                rightIcon='chevron-right'
            />
        );
    }

    return (
        <OptionItem
            type={Platform.select({ios: 'arrow', default: 'default'})}
            icon='product-playbooks'
            action={onPress}
            label={intl.formatMessage(messages.playbookRuns)}
            info={playbooksActiveRuns.toString()}
        />
    );
};

export default PlaybookRunsOption;
