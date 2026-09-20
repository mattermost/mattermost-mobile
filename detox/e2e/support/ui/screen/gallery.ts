// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    isAndroid,
    timeouts,
    wait,
    waitForElementToExist,
    waitForElementToNotExist,
} from '@support/utils';
import {expect as detoxExpect} from 'detox';

// Keep in sync with SHOW_CONTROLS_TIMEOUT and the overlay opacity in
// video_controls/index.tsx, and translateYConfig in @hooks/gallery.
const AUTO_HIDE_MS = 4000;
const FADE_MS = 300;
const SLIDE_MS = 400;
const SETTLE_MS = Math.max(FADE_MS, SLIDE_MS);

// The label renders whole seconds, so a landed seek can still read a second off.
const SEEK_TOLERANCE_SEC = 1;

class GalleryScreen {
    testID = {
        closeButton: 'gallery.header.close.button',
        copyPublicLinkButton: 'gallery.footer.copy_public_link.button',
        shareButton: 'gallery.footer.share.button',
        player: 'gallery.video.player',
        controls: 'gallery.video.controls',
        controlsOverlay: 'gallery.video.controls.overlay',
        error: 'gallery.video.error',
        playButton: 'gallery.video.play.button',
        pauseButton: 'gallery.video.pause.button',
        rewindButton: 'gallery.video.rewind.button',
        forwardButton: 'gallery.video.forward.button',
        fullscreenButton: 'gallery.video.fullscreen.button',
        captionsButton: 'gallery.video.captions.button',
        speedButton: 'gallery.video.speed.button',
        speedMenu: 'gallery.video.speed_menu',
        speedMenuDoneButton: 'gallery.video.speed_menu.done.button',
        currentTime: 'gallery.video.current_time',
        duration: 'gallery.video.duration',
        progressBar: 'gallery.video.progress_bar',
    };

    // RNGH duplicates the close button's testID on iOS; index 0 takes the touch.
    closeButton = element(by.id(this.testID.closeButton)).atIndex(0);
    copyPublicLinkButton = element(by.id(this.testID.copyPublicLinkButton)).atIndex(0);
    shareButton = element(by.id(this.testID.shareButton));

    player = element(by.id(this.testID.player));
    controls = element(by.id(this.testID.controls));
    controlsOverlay = element(by.id(this.testID.controlsOverlay));
    error = element(by.id(this.testID.error));
    playButton = element(by.id(this.testID.playButton));
    pauseButton = element(by.id(this.testID.pauseButton));
    rewindButton = element(by.id(this.testID.rewindButton));
    forwardButton = element(by.id(this.testID.forwardButton));
    fullscreenButton = element(by.id(this.testID.fullscreenButton));
    captionsButton = element(by.id(this.testID.captionsButton));
    speedButton = element(by.id(this.testID.speedButton));
    speedMenu = element(by.id(this.testID.speedMenu));
    speedMenuDoneButton = element(by.id(this.testID.speedMenuDoneButton));
    currentTime = element(by.id(this.testID.currentTime));
    duration = element(by.id(this.testID.duration));
    progressBar = element(by.id(this.testID.progressBar));

    getSpeedOption = (rate: number) => element(by.id(`gallery.video.speed_option.${rate}`));

    getFileAttachment = (fileId: string) => element(by.id(`${fileId}-file`));

    toBeVisible = async () => {
        await waitForElementToExist(element(by.id(this.testID.closeButton)), timeouts.HALF_MIN);
        return this.closeButton;
    };

    // Software H.264 decode on the CI emulator can be slow to produce the first frame.
    videoToBeVisible = async () => {
        await waitForElementToExist(this.player, timeouts.HALF_MIN);
        return this.player;
    };

    // seekSeconds derives from duration, so the seek controls are absent until onLoad.
    videoToBeLoaded = async (timeout: number = timeouts.HALF_MIN) => {
        const deadline = Date.now() + timeout;
        do {
            // eslint-disable-next-line no-await-in-loop
            const seconds = await this.durationSeconds();
            if (seconds > 0) {
                return seconds;
            }

            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.HALF_SEC);
        } while (Date.now() < deadline);

        throw new Error('GalleryScreen: the video never reported a duration (onLoad did not fire)');
    };

    open = async (fileId: string) => {
        await waitForElementToExist(element(by.id(`${fileId}-file-container`)), timeouts.TEN_SEC);
        await this.getFileAttachment(fileId).tap();
        return this.toBeVisible();
    };

    close = async () => {
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await this.closeButton.tap();
        }
        await waitForElementToNotExist(element(by.id(this.testID.closeButton)), timeouts.TEN_SEC);
    };

    // For cleanup after a test that may have failed mid-gallery. Only the probe is
    // optional: a gallery that is open but will not close must still fail.
    closeIfOpen = async () => {
        try {
            await waitForElementToExist(element(by.id(this.testID.closeButton)), timeouts.ONE_SEC);
        } catch {
            return;
        }

        await this.close();
    };

    TOGGLE_TIMEOUT = SETTLE_MS + timeouts.TWO_SEC;

    AUTO_HIDE_TIMEOUT = AUTO_HIDE_MS + SETTLE_MS + timeouts.TWO_SEC;

    // The overlay fades without unmounting, so toBeVisible/toExist cannot see the state.
    // Android exposes alpha; iOS only `enabled`, which tracks its pointerEvents.
    private overlayIsShown = async () => {
        try {
            const attributes = await this.controlsOverlay.getAttributes();
            const attrs = ('elements' in attributes ? attributes.elements[0] : attributes) as
                Partial<Detox.AndroidElementAttributes & Detox.IosElementAttributes>;
            return isAndroid() ? (attrs.alpha ?? 0) > 0.9 : Boolean(attrs.enabled);
        } catch {
            // not attached / not matched
            return false;
        }
    };

    private pollOverlay = async (shown: boolean, timeout: number) => {
        const deadline = Date.now() + timeout;
        do {
            // eslint-disable-next-line no-await-in-loop
            if (await this.overlayIsShown() === shown) {
                return true;
            }

            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.HALF_SEC);
        } while (Date.now() < deadline);

        return false;
    };

    controlsAreVisible = async (timeout?: number) =>
        this.pollOverlay(true, timeout ?? this.TOGGLE_TIMEOUT);

    // Reads m:ss or h:mm:ss. iOS prefixes the duration label with '-' for remaining.
    private timeLabelSeconds = async (el: Detox.IndexableNativeElement | Detox.NativeElement) => {
        const attributes = await el.getAttributes();
        const attrs = ('elements' in attributes ? attributes.elements[0] : attributes) as {text?: string};
        const raw = (attrs.text ?? '').replace('-', '').trim();
        const parts = raw.split(':').map(Number);
        if (!raw || parts.some(isNaN)) {
            throw new Error(`GalleryScreen: could not parse time label "${attrs.text}"`);
        }
        return parts.reduce((total, part) => (total * 60) + part, 0);
    };

    currentTimeSeconds = async () => this.timeLabelSeconds(this.currentTime);

    // The label lags behind a seek: it only refreshes on the debounced onProgress.
    waitForCurrentTimeNear = async (expected: number, tolerance: number, timeout: number = timeouts.TEN_SEC) => {
        const deadline = Date.now() + timeout;
        let last = -1;
        do {
            // eslint-disable-next-line no-await-in-loop
            last = await this.currentTimeSeconds();
            if (Math.abs(last - expected) <= tolerance) {
                return last;
            }

            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.HALF_SEC);
        } while (Date.now() < deadline);

        throw new Error(`GalleryScreen: elapsed time settled at ${last}s, expected ~${expected}s (±${tolerance})`);
    };

    durationSeconds = async () => {
        try {
            return await this.timeLabelSeconds(this.duration);
        } catch {
            return 0;
        }
    };

    // iOS shows remaining rather than total, recoverable by adding the elapsed time.
    totalDurationSeconds = async () => {
        const label = await this.durationSeconds();
        if (isAndroid()) {
            return label;
        }
        return label + (await this.currentTimeSeconds());
    };

    // The tap toggles, so probe before and after rather than tapping blind.
    showControls = async () => {
        if (await this.controlsAreVisible()) {
            return;
        }

        await this.controls.tapAtPoint({x: 200, y: 230});
        if (!(await this.controlsAreVisible(this.TOGGLE_TIMEOUT))) {
            throw new Error('GalleryScreen.showControls: controls did not appear after tapping the video');
        }
    };

    hideControls = async () => {
        if (!(await this.controlsAreVisible())) {
            return;
        }

        // Let the reveal finish so the tap is not racing the animation it reverses.
        await wait(SETTLE_MS);
        await this.controls.tapAtPoint({x: 200, y: 230});
        await this.controlsToBeHidden(this.TOGGLE_TIMEOUT);
    };

    // On iOS a tap on a hidden control only reveals the overlay, so the reveal and the tap
    // race the 4s auto-hide. Idempotent: already being in the target state is a no-op.
    private tapControl = async (
        control: Detox.IndexableNativeElement | Detox.NativeElement,
        landed: () => Promise<boolean>,
        description: string,
    ) => {
        if (await landed()) {
            return;
        }

        for (let attempt = 0; attempt < 3; attempt++) {
            // eslint-disable-next-line no-await-in-loop
            await this.showControls();

            try {
                // eslint-disable-next-line no-await-in-loop
                await control.tap();
            } catch {
                // the control faded out from under the tap; reveal and retry
                continue;
            }

            // eslint-disable-next-line no-await-in-loop
            if (await landed()) {
                return;
            }
        }

        throw new Error(`GalleryScreen: ${description}`);
    };

    private elementExists = async (el: Detox.IndexableNativeElement | Detox.NativeElement) => {
        try {
            await waitForElementToExist(el, timeouts.FOUR_SEC);
            return true;
        } catch {
            return false;
        }
    };

    // The pause button only means the app thinks it is playing; a slow decode can leave
    // the clock stuck. Only a moving clock proves playback really started.
    waitForPlaybackToAdvance = async (minAdvanceSeconds = 1, timeout: number = timeouts.HALF_MIN) => {
        const deadline = Date.now() + timeout;
        const start = await this.currentTimeSeconds();

        do {
            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.ONE_SEC);

            // eslint-disable-next-line no-await-in-loop
            const now = await this.currentTimeSeconds();
            if (now - start >= minAdvanceSeconds) {
                return now;
            }
        } while (Date.now() < deadline);

        throw new Error(`GalleryScreen: playback did not advance ${minAdvanceSeconds}s past ${start}s`);
    };

    // Video-seconds per second of wall clock. The label has 1s granularity, so sample
    // over several seconds to keep the quantisation error small.
    playbackRate = async (sampleMs: number = timeouts.FOUR_SEC) => {
        const start = await this.currentTimeSeconds();
        const startedAt = Date.now();

        await wait(sampleMs);

        const advanced = await this.currentTimeSeconds() - start;
        return advanced / ((Date.now() - startedAt) / 1000);
    };

    // The play/pause testID swaps, so one button's presence proves the other's tap landed.
    play = async () => this.tapControl(
        this.playButton,
        () => this.elementExists(this.pauseButton),
        'play: the video did not reach a playing state',
    );

    pause = async () => this.tapControl(
        this.pauseButton,
        () => this.elementExists(this.playButton),
        'pause: the video did not reach a paused state',
    );

    // Taps once: a seek is not idempotent, so a retry overshoots. Callers must pause
    // first, or the clock never settles on the expected offset.
    private seek = async (
        control: Detox.IndexableNativeElement | Detox.NativeElement,
        direction: -1 | 1,
        description: string,
    ) => {
        const step = await this.seekStepSeconds();
        const before = await this.currentTimeSeconds();
        const duration = await this.totalDurationSeconds();
        const expected = Math.min(Math.max(before + (direction * step), 0), duration);

        await this.showControls();
        await control.tap();

        try {
            // onProgress is debounced, so the label lags the seek.
            await this.waitForCurrentTimeNear(expected, SEEK_TOLERANCE_SEC);
        } catch {
            throw new Error(`GalleryScreen: ${description}: expected the elapsed time to reach ${expected}s from ${before}s`);
        }

        return expected;
    };

    rewind = async () => this.seek(this.rewindButton, -1, 'rewind');

    forward = async () => this.seek(this.forwardButton, 1, 'forward');

    // Mirrors seekSeconds in video_renderer.tsx.
    seekStepSeconds = async () => {
        const duration = await this.totalDurationSeconds();
        if (duration < 10) {
            return 0;
        }
        return duration > 600 ? 30 : 10;
    };

    // The speed button toggles, so a retry would close what the previous tap opened.
    openSpeedMenu = async () => {
        if (await this.elementExists(this.speedMenu)) {
            return;
        }

        await this.showControls();
        await this.speedButton.tap();
        await waitForElementToExist(this.speedMenu, this.TOGGLE_TIMEOUT);
    };

    selectSpeed = async (rate: number) => {
        await this.openSpeedMenu();

        // Not tapControl: its retry reveals the overlay with a background tap, which
        // closes the menu the option lives in.
        await this.getSpeedOption(rate).tap();
        await waitForElementToNotExist(this.speedMenu, timeouts.TEN_SEC);
    };

    // The header slides off-screen rather than unmounting, so only toBeVisible sees it.
    private headerIsVisible = async () => {
        try {
            await detoxExpect(this.closeButton).toBeVisible();
            return true;
        } catch {
            return false;
        }
    };

    toggleFullscreen = async (expectHeaderHidden: boolean) => this.tapControl(
        this.fullscreenButton,
        async () => await this.headerIsVisible() !== expectHeaderHidden,
        `toggleFullscreen: the gallery header did not become ${expectHeaderHidden ? 'hidden' : 'visible'}`,
    );

    playButtonToBeVisible = async (timeout?: number) => {
        if (!(await this.controlsAreVisible(timeout))) {
            throw new Error('GalleryScreen: expected the controls to be visible');
        }
        await waitForElementToExist(this.playButton, timeouts.TWO_SEC);
    };

    controlsToBeVisible = async (timeout?: number) => {
        if (!(await this.controlsAreVisible(timeout ?? timeouts.FIVE_SEC))) {
            throw new Error('GalleryScreen: expected the video controls to be visible');
        }
    };

    controlsToBeHidden = async (timeout?: number) => {
        const hidden = await this.pollOverlay(false, timeout ?? this.AUTO_HIDE_TIMEOUT);
        if (!hidden) {
            throw new Error('GalleryScreen: expected the video controls to be hidden');
        }
    };
}

const galleryScreen = new GalleryScreen();
export default galleryScreen;
