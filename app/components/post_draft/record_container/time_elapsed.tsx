// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react';
import {Text} from 'react-native';

//fixme: hook up the time elapsed progress from the lib in here

const TimeElapsed = () => {
    const [timeElapsed] = useState('00:00');

    return (
        <Text>
            {timeElapsed}
        </Text>
    );
};

export default TimeElapsed;
