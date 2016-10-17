import _ from 'lodash';
import {TeamsTypes as types} from 'constants';

const init_state = {
  status: 'not fetched',
  error: null,
  data: [],
};

export default function reduceReviews(state = init_state, action) {
  switch (action.type) {

  case types.FETCH_TEAMS:
    return {...state,
      status: 'fetching',
      error: null,
    };
  case types.FETCH_TEAMS_SUCCESS:
    return {...state,
      status: 'fetched',
      data: _.values(action.data),
    };
  case types.FETCH_TEAMS_FAILURE:
    return {...state,
      status: 'failed',
      error: action.error,
    };

  default:
    return state;
  }
}
