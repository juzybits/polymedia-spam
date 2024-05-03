import { SpamStatus } from "@polymedia/spam-sdk";

export const StatusSpan: React.FC<{
    status?: SpamStatus;
}> = ({
    status,
}) => {
    if (!status) {
        return <span>loading</span>;
    }
    let className: string;
    if (status === "stopped") { className = "text-red"; }
    else if (status === "stopping") { className = "text-orange"; }
    else { className = "text-green"; }
    return <span className={className} >{status}</span>;
};
