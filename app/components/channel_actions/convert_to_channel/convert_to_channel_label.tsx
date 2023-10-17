// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import OptionItem from '@app/components/option_item';
import {Screens} from '@app/constants';
import {useTheme} from '@app/context/theme';
import {dismissBottomSheet, goToScreen} from '@app/screens/navigation';
import {preventDoubleTap} from '@app/utils/tap';

const ConvertToChannelLabel = () => {
    const goToConvertToPrivateChannl = preventDoubleTap(async () => {
        await dismissBottomSheet();

        const title = 'Convert to Private Channel';
        goToScreen(Screens.CONVERT_GM_TO_CHANNEL, title, {});
    });

    // LOL: localize this
    return (
        <OptionItem
            action={goToConvertToPrivateChannl}
            icon='lock-outline'
            label='Convert to a Private Channel'
            type='default'
        />
    );
};

export default ConvertToChannelLabel;
