// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import InAppReview from 'react-native-in-app-review';

import {storeFirstLaunch} from '@actions/app/global';
import LocalConfig from '@assets/config.json';
import {General, Launch} from '@constants';
import {getDontAskForReview, getFirstLaunch, getLastAskedForReview} from '@queries/app/global';
import {areAllServersSupported} from '@queries/app/servers';
import {showReviewOverlay} from '@screens/navigation';

export const tryRunAppReview = async (launchType: string, coldStart?: boolean) => {
    if (!LocalConfig.ShowReview) {
        return;
    }

    if (!coldStart) {
        return;
    }

    if (launchType !== Launch.Normal) {
        return;
    }

    if (!InAppReview.isAvailable()) {
        return;
    }

    const supported = await areAllServersSupported();
    if (!supported) {
        return;
    }

    const dontAsk = await getDontAskForReview();
    if (dontAsk) {
        return;
    }

    const lastReviewed = await getLastAskedForReview();
    if (lastReviewed) {
        if (Date.now() - lastReviewed > General.TIME_TO_NEXT_REVIEW) {
            showReviewOverlay(true);
        }

        return;
    }

    const firstLaunch = await getFirstLaunch();
    if (!firstLaunch) {
        storeFirstLaunch();
        return;
    }

    if ((Date.now() - firstLaunch) > General.TIME_TO_FIRST_REVIEW) {
        showReviewOverlay(false);
    }
};
