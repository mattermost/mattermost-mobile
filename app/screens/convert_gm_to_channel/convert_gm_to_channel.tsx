// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';

import {ConvertGMToChannelForm} from './convert_gm_to_channel_form';
import {Loader} from './loader';

type Props = {

}

const loadingIndicatorTimeout = 1200;

const ConvertGMToChannel = (props: Props) => {
    const [loadingAnimationTimeout, setLoadingAnimationTimeout] = useState(false);

    useEffect(() => {
        setTimeout(() => setLoadingAnimationTimeout(true), loadingIndicatorTimeout);
    }, []);

    const showLoader = !loadingAnimationTimeout;
    if (showLoader) {
        return (<Loader/>);
    }

    return (
        <ConvertGMToChannelForm/>
    );
};

export default ConvertGMToChannel;
