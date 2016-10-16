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

    case types.FETCH_CHANNELS_REQUEST:
        return {...state,
            status: 'fetching',
            error: null
        };
    case types.FETCH_CHANNELS_SUCCESS:
        return {...state,
            status: 'fetched',
            data: action.data.channels
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
