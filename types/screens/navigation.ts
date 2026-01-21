// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Screens} from '@constants';

type ScreenKeys = keyof typeof Screens;
export type AvailableScreens = typeof Screens[ScreenKeys] | '(modals)';
