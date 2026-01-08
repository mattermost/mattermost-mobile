// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Duplicated types from @mattermost/e2ee library.
 * This allows importing types even when the native module isn't available.
 *
 * IMPORTANT: When updating @mattermost/e2ee library, update these types to match.
 */

export interface E2EESpec {
    greet(name: string): string;
    helloFromRust(): string;
}
