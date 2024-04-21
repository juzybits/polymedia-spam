export const ErrorBox: React.FC<{
    err: Error|string|null;
}> = ({
    err,
}) =>
{
    if (!err) {
        return null;
    }
    return <div className="error-box">
        <div>Something went wrong:</div>
        <div>{String(err)}</div>
    </div>;
};
