export enum SpamError {
    EWrongEpoch = 100,
    EDirectorIsPaused = 101,
    EUserIsRegistered = 102,
    EUserCounterIsRegistered = 104,
    EUserCounterIsNotRegistered = 103,
}

export function parseSpamError(errorMessage: string): SpamError | null {
    const regex = /, (\d+)\) in command/;
    const match = errorMessage.match(regex);
    if (match) {
        const code = parseInt(match[1]);
        if (code in SpamError) {
            return code as SpamError;
        }
    }
    return null;
}
