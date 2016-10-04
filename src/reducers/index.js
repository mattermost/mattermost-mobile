import general from './general';
import device from './device';
import {combineReducers} from 'redux';

const entities = combineReducers({
    general
});

const views = combineReducers({
    device
});

const rootReducer = combineReducers({
    entities,
    views
});

export default rootReducer;