import {ViewTypes} from 'app/constants';

export function setLastUpgradeCheck() {
    return {
        type: ViewTypes.SET_LAST_UPGRADE_CHECK
    };
}
