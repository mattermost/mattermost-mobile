// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TextStyle} from 'react-native';

export type SyntaxHiglightProps = {
    code: string;
    language: string;
    textStyle: TextStyle;
    selectable?: boolean;
};
