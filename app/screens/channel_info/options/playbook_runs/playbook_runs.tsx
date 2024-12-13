// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    teamId: string;
    channelId: string;
};

const PlaybookRuns = ({teamId, channelId}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const title = formatMessage({id: 'channel_info.playbook runs', defaultMessage: 'Playbook runs'});
    const count = useActivePlaybookRunsCount(serverUrl, teamId, channelId);

    const goToPlaybookRuns = preventDoubleTap(() => null);

    return (
        <OptionItem
            action={goToPlaybookRuns}
            label={title}
            icon='product-playbooks'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            info={count}
            testID='channel_info.options.playbook_runs.option'
        />
    );
};

export default PlaybookRuns;
