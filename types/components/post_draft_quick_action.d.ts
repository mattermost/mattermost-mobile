// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';
import {Asset} from 'react-native-image-picker';

import type {Theme} from '@mm-redux/types/preferences';

export interface QuickActionAttachmentProps {
    disabled: boolean;
    fileCount: number;
    intl: typeof intlShape;
    maxFileCount: number;
    onUploadFiles: (files: Asset[]) => void;
    testID: string;
    theme: Theme;
}
