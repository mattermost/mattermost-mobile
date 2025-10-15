// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DaakiaAvatar from '@components/daakia_components/daakia_avatar';

type Props = {
    theme: Theme;
}

const SystemAvatar = ({theme}: Props) => {
    return (
        <DaakiaAvatar theme={theme}/>
    );
};

export default SystemAvatar;
