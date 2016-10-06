import general from './general';
import device from './device';
import {combineReducers} from 'redux';

const entities = combineReducers({
    general
});

const views = combineReducers({
    device
});

export default combineReducers({
    entities,
    views
});