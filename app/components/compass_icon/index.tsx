// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIconSetFromFontello} from 'react-native-vector-icons';

import fontelloConfig from '@assets/compass-icons.json';

const CompassIcon = createIconSetFromFontello(fontelloConfig, 'compass-icons',
    'compass-icons.ttf');

export default CompassIcon;
