const initialState = {
    lastUpdateCheck: 0,
};

import {ViewTypes} from 'app/constants';

export default function clientUpgrade(state = initialState, action) {
    switch (action.type) {
    case ViewTypes.SET_LAST_UPGRADE_CHECK:
        return {
            lastUpdateCheck: Date.now(),
        };
    default:
        return state;
    }
}
