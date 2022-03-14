// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ViewToken} from 'react-native';

export type ViewableItemsChanged = {
    viewableItems: ViewToken[];
    changed: ViewToken[];
}

export type ViewableItemsChangedListenerEvent = (viewableItms: ViewToken[]) => void;
