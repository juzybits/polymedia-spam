import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { useEffect } from "react";

export const PageSpam: React.FC = () =>
{
    const { wallet } = useOutletContext<AppContext>();
    const navigate = useNavigate();

    useEffect(() => {
        !wallet && navigate("/user");
    }, [wallet])

    return <div id="page-content" >
        <h1>Spam</h1>
        Ready to spam
    </div>;
}
