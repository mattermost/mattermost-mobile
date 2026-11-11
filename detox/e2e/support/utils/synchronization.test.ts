// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {createSynchronization, type SynchronizationDriver} from './synchronization';

/**
 * A device driver that records each call in order; `fail` makes one call throw instead.
 * @param fail - which driver call throws, if any
 * @returns the driver and the list of calls it received
 */
function recordingDriver(fail?: keyof SynchronizationDriver) {
    const calls: string[] = [];
    const record = (name: keyof SynchronizationDriver) => async () => {
        calls.push(name);
        if (fail === name) {
            throw new Error("Attempt to read from field 'android.os.MessageQueue android.os.Looper.mQueue' on a null object reference");
        }
    };
    const driver: SynchronizationDriver = {
        disable: record('disable'),
        enable: record('enable'),
        reload: record('reload'),
        settle: record('settle'),
    };
    return {driver, calls};
}

describe('createSynchronization', () => {
    it('should toggle the device once for nested disabled windows', async () => {
        const {driver, calls} = recordingDriver();
        const sync = createSynchronization(driver);

        await sync.withSynchronizationDisabled(async () => {
            await sync.disableSynchronization();
            await sync.withSynchronizationDisabled(async () => {
                assert.equal(sync.depth(), 3);
            });
            await sync.enableSynchronization();
            assert.equal(sync.depth(), 1);
        });

        assert.deepEqual(calls, ['disable', 'enable']);
        assert.equal(sync.depth(), 0);
    });

    it('should keep a raw disable/enable pair from re-enabling inside an outer window', async () => {
        const {driver, calls} = recordingDriver();
        const sync = createSynchronization(driver);

        await sync.disableSynchronization();
        await sync.withSynchronizationDisabled(async () => {
            // A helper's window inside a spec's window: no enable between them.
        });
        assert.deepEqual(calls, ['disable']);
        await sync.enableSynchronization();

        assert.deepEqual(calls, ['disable', 'enable']);
    });

    it('should still enable on an enable call with no window open', async () => {
        const {driver, calls} = recordingDriver();
        const sync = createSynchronization(driver);

        await sync.enableSynchronization();

        assert.deepEqual(calls, ['enable']);
        assert.equal(sync.depth(), 0);
    });

    it('should close the window and rethrow when the wrapped action fails', async () => {
        const {driver, calls} = recordingDriver();
        const sync = createSynchronization(driver);

        await assert.rejects(sync.withSynchronizationDisabled(async () => {
            throw new Error('tap failed');
        }), /tap failed/);

        assert.deepEqual(calls, ['disable', 'enable']);
        assert.equal(sync.depth(), 0);
    });

    it('should surface a failed disable instead of swallowing it, and leave no window open', async () => {
        const {driver, calls} = recordingDriver('disable');
        const sync = createSynchronization(driver);
        let ran = false;

        await assert.rejects(sync.withSynchronizationDisabled(async () => {
            ran = true;
        }), /Looper\.mQueue/);

        assert.equal(ran, false);
        assert.deepEqual(calls, ['disable']);
        assert.equal(sync.depth(), 0);
    });

    it('should settle after a reload before anything can disable', async () => {
        const {driver, calls} = recordingDriver();
        const sync = createSynchronization(driver);

        await sync.reloadApp();
        await sync.withSynchronizationDisabled(async () => {
            // e.g. bestEffortScroll right after the reload
        });

        assert.deepEqual(calls, ['reload', 'settle', 'disable', 'enable']);
    });

    it('should turn synchronization off again after a reload inside an open window', async () => {
        const {driver, calls} = recordingDriver();
        const sync = createSynchronization(driver);

        await sync.withSynchronizationDisabled(async () => {
            await sync.reloadApp();
        });

        assert.deepEqual(calls, ['disable', 'reload', 'settle', 'disable', 'enable']);
    });
});
