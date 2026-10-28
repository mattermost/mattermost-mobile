// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {VoiceRecordActionProps} from './types';
import type {ComponentType} from 'react';

// Voice recording is intentionally Android-only in this phase. Keeping the fallback in a
// platform-resolved module also prevents iOS and non-Android tests from loading native audio code.
const VoiceRecordAction: ComponentType<VoiceRecordActionProps> = () => null;

export default VoiceRecordAction;
