import { Button } from "./ui/button";
import { Wallet } from "lucide-react";

export const WalletConnectButton = () => {
    return (
        <Button
            variant="outline"
            className="opacity-50 cursor-not-allowed"
            onClick={() => alert("Wallet connection is currently disabled for maintenance.")}
        >
            <Wallet className="w-4 h-4 mr-2" />
            Wallet Disabled
        </Button>
    );
};
