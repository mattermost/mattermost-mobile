// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fontelloConfig from '@mattermost/compass-icons/config.json';
import {createIconSetFromFontello} from 'react-native-vector-icons';

const CompassIcon = createIconSetFromFontello(fontelloConfig, 'compass-icons',
    'compass-icons.ttf');

export default CompassIcon;
