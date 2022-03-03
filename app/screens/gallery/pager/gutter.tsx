// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {typedMemo} from '@utils/gallery';

type IGutterProps = {
  width: number;
};

const Gutter = typedMemo(({width}: IGutterProps) => {
    return <View style={{width}}/>;
});

export default Gutter;
