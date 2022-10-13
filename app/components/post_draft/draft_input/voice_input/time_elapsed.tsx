// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Text} from 'react-native';

//fixme: hook up the time elapsed progress from the lib in here
type Props = {
    timeElapsed: string;
}

const TimeElapsed = ({timeElapsed}: Props) => {
    return (
        <Text>
            {timeElapsed}
        </Text>
    );
};

export default TimeElapsed;
