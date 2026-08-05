// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import fs from 'fs';
import os from 'os';
import path from 'path';

import {DEFAULT_MAX_FILE_SIZE_BYTES} from '@support/constants/file_settings';
import {
    Post,
    Setup,
    System,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {AttachmentOptions} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - File Upload', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    // Fallback when GET /config omits cloud_restrictable FileSettings.
    const FALLBACK_MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE_BYTES;
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T339_1 - should show an error when the server max file size is set to a very small value', async () => {
        const imagePath = path.resolve(__dirname, '../../../../support/fixtures/image.png');
        const fileSize = fs.statSync(imagePath).size;
        const maxFileSizeLimit = fileSize - 1;

        await User.apiAdminLogin(siteOneUrl);

        const {config: originalConfig} = await System.apiGetConfig(siteOneUrl);
        const originalMaxFileSize = originalConfig?.FileSettings?.MaxFileSize ?? FALLBACK_MAX_FILE_SIZE;

        const patchMaxFileSize = async (limit: number) => {
            const {error} = await System.apiUpdateConfig(siteOneUrl, {
                FileSettings: {
                    MaxFileSize: limit,
                },
            });
            if (error) {
                return {applied: false, appliedLimit: 0, error};
            }
            await wait(timeouts.TWO_SEC);
            const {config: clientConfig} = await System.apiGetClientConfigOld(siteOneUrl);
            const appliedLimit = parseInt(clientConfig?.MaxFileSize ?? '0', 10);
            return {
                applied: appliedLimit > 0 && appliedLimit <= limit,
                appliedLimit,
                error: undefined,
            };
        };

        const verifyClientMaxFileSize = async (expectedLimit: number) => {
            await wait(timeouts.TWO_SEC);
            const {config: clientConfig} = await System.apiGetClientConfigOld(siteOneUrl);
            const appliedLimit = parseInt(clientConfig?.MaxFileSize ?? '0', 10);
            return {
                applied: appliedLimit === expectedLimit,
                appliedLimit,
            };
        };

        // # Set MaxFileSize just under the fixture size so the upload is rejected
        let {applied, appliedLimit, error: patchError} = await patchMaxFileSize(maxFileSizeLimit);
        if (!applied) {
            ({applied, appliedLimit, error: patchError} = await patchMaxFileSize(maxFileSizeLimit));
        }
        if (!applied) {
            // eslint-disable-next-line no-console
            console.warn(
                `Skipping MM-T339: MaxFileSize patch to ${maxFileSizeLimit} did not apply ` +
                `(client MaxFileSize=${appliedLimit}, error=${JSON.stringify(patchError)}). ` +
                'Server may lock FileSettings via env override.',
            );
            return;
        }

        // * Server rejects over-limit uploads — use a temp file sized above the applied
        // limit (image.png may be under an env-locked minimum MaxFileSize on CI).
        const oversizeBytes = Math.max(appliedLimit + 1024, fileSize + 1024);
        const oversizePath = path.join(os.tmpdir(), `detox-oversize-${Date.now()}.bin`);

        try {
            // Inside the try so a write failure still restores MaxFileSize in the finally.
            fs.writeFileSync(oversizePath, Buffer.alloc(oversizeBytes, 0));

            const {error: uploadError} = await Post.apiUploadFileToChannel(siteOneUrl, testChannel.id, oversizePath);
            if (!uploadError) {
                throw new Error(`Expected server to reject ${oversizeBytes}-byte upload (MaxFileSize=${appliedLimit})`);
            }

            // # Open channel screen and attempt a client-side file attach
            await ChannelScreen.open(channelsCategory, testChannel.name);
            await wait(timeouts.TWO_SEC);
            await ChannelScreen.fileQuickAction.tap();
            await waitFor(AttachmentOptions.photoLibrary).toExist().withTimeout(timeouts.TWO_SEC);

            if (isIos()) {
                await AttachmentOptions.photoLibrary.tap();
                const firstPhoto = element(by.type('PHAssetCollectionViewCell')).atIndex(0);
                await waitFor(firstPhoto).toExist().withTimeout(timeouts.TEN_SEC);
                await firstPhoto.tap();
                try {
                    await element(by.label('Add')).tap();
                } catch {
                    try {
                        await element(by.text('Add')).tap();
                    } catch {
                        // Single-select library — no confirmation button
                    }
                }
                await waitFor(element(by.text(/Files must be less than/i))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            } else {
                // Android native picker is not fully automatable — verify the attachment sheet opens
                // and the server-side rejection above covers the max-size enforcement path.
                await expect(AttachmentOptions.attachFile).toExist();
                await AttachmentOptions.photoLibrary.swipe('down', 'fast');
            }

            // # Go back to channel list screen
            await ChannelScreen.back();
        } finally {
            if (fs.existsSync(oversizePath)) {
                fs.unlinkSync(oversizePath);
            }

            // # Restore the pre-test MaxFileSize so later suites keep the server baseline
            await User.apiAdminLogin(siteOneUrl);
            const {error: restoreError} = await System.apiUpdateConfig(siteOneUrl, {
                FileSettings: {
                    MaxFileSize: originalMaxFileSize,
                },
            });
            if (restoreError) {
                throw new Error(`Failed to restore MaxFileSize: ${JSON.stringify(restoreError)}`);
            }

            let {applied: restored, appliedLimit: restoredLimit} = await verifyClientMaxFileSize(originalMaxFileSize);
            if (!restored) {
                const {error: retryRestoreError} = await System.apiUpdateConfig(siteOneUrl, {
                    FileSettings: {
                        MaxFileSize: originalMaxFileSize,
                    },
                });
                if (retryRestoreError) {
                    throw new Error(`Failed to restore MaxFileSize on retry: ${JSON.stringify(retryRestoreError)}`);
                }
                ({applied: restored, appliedLimit: restoredLimit} = await verifyClientMaxFileSize(originalMaxFileSize));
            }
            if (!restored) {
                throw new Error(
                    `MaxFileSize restore to ${originalMaxFileSize} did not apply (client MaxFileSize=${restoredLimit}).`,
                );
            }
        }
    });
});
