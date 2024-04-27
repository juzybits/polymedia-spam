import { SpamStatus } from "@polymedia/spam-sdk";

export const StatusSpan: React.FC<{
    status?: SpamStatus;
}> = ({
    status,
}) => {
    if (!status) {
        return <span>loading</span>;
    }
    let color: string;
    if (status === "stopped") { color = "rgb(255 130 130)"; } // red
    else if (status === "stopping") { color = "rgb(255 190 71)"; } // orange
    else { color = "lightgreen"; }
    return <span style={{color}} >{status}</span>;
};
