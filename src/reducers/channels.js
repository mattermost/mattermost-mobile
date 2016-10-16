import _ from 'lodash';
import {ChannelsTypes as types} from 'constants';

const initState = {
    status: 'not fetched',
    error: null,
    data: [],
    current_channel_id: null
};

export default function reduceChannels(state = initState, action) {
    switch (action.type) {

    case types.SELECT_CHANNEL:
        return {...state,
            current_channel_id: action.channel_id
        };

    case types.FETCH_CHANNELS:
        return {...state,
            status: 'fetching',
            error: null
        };
    case types.FETCH_CHANNELS_SUCCESS:
        return {...state,
            status: 'fetched',
            data: _.values(action.data)
        };
    case types.FETCH_CHANNELS_FAILURE:
        return {...state,
            status: 'failed',
            error: action.error
        };

    default:
        return state;
    }
}
