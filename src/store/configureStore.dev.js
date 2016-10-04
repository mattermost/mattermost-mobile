import {createStore, applyMiddleware, compose} from 'redux';
import createLogger from 'redux-logger';
import rootReducer from '../reducers';
import devTools from 'remote-redux-devtools';
import thunk from 'redux-thunk';

export default function configureStore(preloadedState) {
    const store = createStore(
        rootReducer,
        preloadedState,
        compose(
            //applyMiddleware(thunk, createLogger()),
            applyMiddleware(thunk),
            devTools({
                name: 'Mattermost',
                hostname: 'localhost',
                port: 5678
            })
        )
    );

    if (module.hot) {
    // Enable Webpack hot module replacement for reducers
        module.hot.accept('../reducers', () => {
            const nextRootReducer = require('../reducers').default;
            store.replaceReducer(nextRootReducer);
        });
    }

    // If you have other enhancers & middlewares
    // update the store after creating / changing to allow devTools to use them
    devTools.updateStore(store);

    return store;
}