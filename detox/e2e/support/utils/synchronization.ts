// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * The one owner of Detox synchronization in the E2E suite. Every disable, enable and React Native reload goes
 * through it, so sync is turned off once for a whole action and on once at its end, however many helpers the
 * action nests.
 *
 * Why it matters on Android: enabling registers a looper idling resource whose looper is only set once the busy
 * React Native JS thread runs a posted setup task (Espresso's LooperIdlingResourceInterrogationHandler). Disabling
 * before that task ran throws "Attempt to read from field 'android.os.MessageQueue android.os.Looper.mQueue' on a
 * null object reference" and leaves the resource stuck busy until the app process restarts ("mqt_v_js is
 * executing"). Toggling off, on and off again around one action, or re-enabling twice, is what triggers it.
 *
 * A reload registers those resources again whatever this module last did (ReactNativeExtension.reloadReactNative),
 * and Detox answers the reload without waiting for them. So a reload is followed by one synchronized check: it
 * returns only once Espresso reports every resource idle, which needs their setup task to have run.
 */

export type SynchronizationDriver = {

    /** Turns Detox synchronization off on the device. */
    disable: () => Promise<void>;

    /** Turns Detox synchronization on on the device. */
    enable: () => Promise<void>;

    /** Reloads the React Native app in place (device.reloadReactNative). */
    reload: () => Promise<void>;

    /** Waits, with synchronization on, until Espresso reports the app idle. */
    settle: () => Promise<void>;
};

export type Synchronization = {

    /** How many disabled windows are open; 0 means synchronization is on. */
    depth: () => number;

    /** Opens a disabled window; only the outermost one turns synchronization off. */
    disableSynchronization: () => Promise<void>;

    /** Closes a disabled window; the last one (or a call with none open) turns synchronization on. */
    enableSynchronization: () => Promise<void>;

    /** Runs fn with synchronization off, nested calls included, and closes the window whatever fn does. */
    withSynchronizationDisabled: <T>(fn: () => Promise<T>) => Promise<T>;

    /** Reloads the app and settles the idling resources the reload registered before anything can disable them. */
    reloadApp: () => Promise<void>;
};

/**
 * Creates the depth-counted synchronization owner over a device driver.
 * @param driver - the device calls; tests pass a fake
 * @returns the functions the suite uses instead of device.disableSynchronization/enableSynchronization/reloadReactNative
 */
export function createSynchronization(driver: SynchronizationDriver): Synchronization {
    let depth = 0;

    const disableSynchronization = async () => {
        depth += 1;
        if (depth > 1) {
            return;
        }
        try {
            await driver.disable();
        } catch (error) {
            depth -= 1;
            throw error;
        }
    };

    const enableSynchronization = async () => {
        if (depth > 1) {
            depth -= 1;
            return;
        }
        depth = 0;
        await driver.enable();
    };

    const withSynchronizationDisabled = async <T>(fn: () => Promise<T>): Promise<T> => {
        await disableSynchronization();
        try {
            return await fn();
        } finally {
            await enableSynchronization();
        }
    };

    const reloadApp = async () => {
        await driver.reload();
        await driver.settle();

        // The reload turned synchronization back on inside an open window; the settled resources can be disabled.
        if (depth > 0) {
            await driver.disable();
        }
    };

    return {
        depth: () => depth,
        disableSynchronization,
        enableSynchronization,
        withSynchronizationDisabled,
        reloadApp,
    };
}
