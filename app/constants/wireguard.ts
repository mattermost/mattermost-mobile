// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Android Keychain internet and generic passwords share one alias namespace. Mattermost
// discovers server sessions by listing these aliases, so app-specific entries must be filtered.
export const WIREGUARD_KEYCHAIN_SERVICE = 'encma.wireguard.configuration';
export const WIREGUARD_KEYCHAIN_ACCOUNT = 'wireguard-config';
