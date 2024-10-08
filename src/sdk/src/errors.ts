export enum SpamError {
    EWrongEpoch= 100,
    EDirectorIsPaused= 101,
    EUserIsRegistered= 102,
    EUserCounterIsRegistered= 103,
    EUserCounterIsNotRegistered= 104,
}

export function parseSpamError(errorMessage: string): SpamError | null {
    const regex = /, (\d+)\) in command/;
    const match = regex.exec(errorMessage);
    if (match) {
        const code = parseInt(match[1]);
        if (code in SpamError) {
            return code as SpamError;
        }
    }
    return null;
}
