// Helper functions to handle Jest timer issues with async code
// These are needed because Jest's fake timers don't play well with Promise-based code.
// The combination of fake timers for time advancement + real timers for nextTick
// allows us to properly test async timing behavior.

export const enableFakeTimers = () => {
    jest.useFakeTimers({doNotFake: ['nextTick']});
};

export const disableFakeTimers = () => {
    jest.useRealTimers();
};

export const advanceTimers = async (ms: number) => {
    jest.advanceTimersByTime(ms);
    await new Promise(process.nextTick);
};
