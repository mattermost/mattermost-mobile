// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ViewToken} from 'react-native';

export type ViewableItemsChanged = {
    viewableItems: ViewToken[];
    changed: ViewToken[];
}

export type ViewableItemsChangedListenerEvent = (viewableItms: ViewToken[]) => void;

export type ScrollEndIndexListener = (fn: (endIndex: number) => void) => () => void;
export type ViewableItemsListener = (fn: (viewableItems: ViewToken[]) => void) => () => void;
