import {PostsTypes as types} from 'constants';

const initState = {
    status: 'not fetched',
    error: null,
    data: {}
};

export default function reducePosts(state = initState, action) {
    switch (action.type) {

    case types.FETCH_POSTS_REQUEST:
        return {...state,
            status: 'fetching',
            error: null
        };
    case types.FETCH_POSTS_SUCCESS:
        return {...state,
            status: 'fetched',
            data: action.data.posts
        };
    case types.FETCH_POSTS_FAILURE:
        return {...state,
            status: 'failed',
            error: action.error
        };

    default:
        return state;
    }
}
