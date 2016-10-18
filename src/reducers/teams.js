import {TeamsTypes as types} from 'constants';

const initState = {
    status: 'not fetched',
    error: null,
    data: {},
    currentTeamId: null
};

export default function reduceTeams(state = initState, action) {
    switch (action.type) {

    case types.SELECT_TEAM:
        return {...state,
            currentTeamId: action.teamId
        };

    case types.FETCH_TEAMS_REQUEST:
        return {...state,
            status: 'fetching',
            error: null
        };
    case types.FETCH_TEAMS_SUCCESS:
        return {...state,
            status: 'fetched',
            data: action.data
        };
    case types.FETCH_TEAMS_FAILURE:
        return {...state,
            status: 'failed',
            error: action.error
        };

    default:
        return state;
    }
}
