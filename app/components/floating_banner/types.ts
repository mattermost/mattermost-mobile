// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ReactNode} from 'react';

export interface FloatingBannerConfig {
    id: string;
    title?: string;
    message?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    dismissible?: boolean;
    autoHideDuration?: number;
    position?: 'top' | 'bottom';
    onPress?: () => void;
    onDismiss?: () => void;
    customComponent?: ReactNode;
}
