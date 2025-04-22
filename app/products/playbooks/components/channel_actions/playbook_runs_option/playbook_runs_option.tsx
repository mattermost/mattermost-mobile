// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {goToPlaybookRuns} from '@playbooks/screens/navigation';
import {dismissBottomSheet} from '@screens/navigation';

type Props = {
    channelId: string;
    playbooksActiveRuns: number;
}

const PlaybookRunsOption = ({
    channelId,
    playbooksActiveRuns,
}: Props) => {
    const intl = useIntl();

    const onPress = useCallback(async () => {
        await dismissBottomSheet();
        goToPlaybookRuns(intl, channelId);
    }, [intl, channelId]);

    return (
        <OptionItem
            type={Platform.select({ios: 'arrow', default: 'default'})}
            icon='product-playbooks'
            action={onPress}
            label={intl.formatMessage({id: 'playbooks.playbooks_runs.title', defaultMessage: 'Playbook runs'})}
            info={playbooksActiveRuns.toString()}
        />
    );
};

export default PlaybookRunsOption;
