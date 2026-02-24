// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {SignatureKeyPairAdapter} from '@mattermost/e2ee';

export interface E2EESpec {
    generateSignatureKeyPair(): SignatureKeyPairAdapter;
}
