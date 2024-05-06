import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageDisclaimer: React.FC = () =>
{
    const { acceptDisclaimer } = useOutletContext<AppContext>();

    return <div className="text-block">
    <div className="text-content">
        <h1><span className="rainbow">Disclaimer</span></h1>

        <p>
            SPAM is experimental software that I built for fun in my spare time. It is offered for free and without any guarantees.
        </p>
        <p>
            The only cost to mine SPAM is Sui transaction fees. I don't make any money from it. Therefore I can't refund your transaction fees if there is a bug that prevents you from claiming your SPAM.
        </p>
        <p>
            I will do my best to make the code as safe as possible, but I can't guarantee that there will never be errors.
        </p>
        <p>
            If you choose to use the miner, you do so at your own risk, and accept the possibility of a bug.
        </p>
        <div className="tight">
            <p>Important things to avoid wasting gas:</p>
            <p>1. <span className="text-red">Register your counter the day after you spam it</span>: if you don't register your counter, you can't claim SPAM with it.</p>
            <p>2. <span className="text-red">Only use your miner wallet for spamming</span>: do not send other transactions from the miner address using a Sui wallet.</p>
            <p>3. <span className="text-red">Stop the miner before withdrawing</span>: if you load the miner secret key into a Sui wallet to withdraw your SPAM, you must stop the miner first.</p>
        </div>
        <p>
            Please DO NOT MINE if you are not comfortable with these risks.
        </p>

        <br />
        <button className="btn" onClick={acceptDisclaimer}>IN UNDERSTAND THE RISKS</button>
    </div>
    </div>;
};
