import  {
    AppBindingLocations,
    AppCallTypes,
    AppFieldTypes,

    getAppBindings,
    getPost,
    getChannel,
    getCurrentChannel,
    getCurrentTeamId,
    doAppCall,
    sendEphemeralPost,
    Store,
} from './app_command_parser_dependencies';

describe('AppCommandParserDependencies', () => {
    test('AppBindingLocations', () => {
        expect(AppBindingLocations).toBeDefined();
    });

    test('AppCallTypes', () => {
        expect(AppCallTypes).toBeDefined();
    });

    test('AppFieldTypes', () => {
        expect(AppFieldTypes).toBeDefined();
    });

    test('Store is defined', () => {
        expect(Store).toBeDefined();
    });

    test ('getAppBindings is defined', () => {
        expect(getAppBindings).toBeDefined();
    });
    test ('getPost is defined', () => {
        expect(getPost).toBeDefined();
    });
    test ('getChannel is defined', () => {
        expect(getChannel).toBeDefined();
    });
    test ('getCurrentChannel is defined', () => {
        expect(getCurrentChannel).toBeDefined();
    });
    test ('getCurrentTeamId is defined', () => {
        expect(getCurrentTeamId).toBeDefined();
    });

    test ('doAppCall is defined', () => {
        expect(doAppCall).toBeDefined();
    });
    test ('sendEphemeralPost is defined', () => {
        expect(sendEphemeralPost).toBeDefined();
    });
})
