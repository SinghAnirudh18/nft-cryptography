import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import Footer from "./Footer";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
    children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    const location = useLocation();
    const isFullWidth = location.pathname === "/" || location.pathname === "/marketplace";

    return (
        <div className="min-h-screen bg-black flex flex-col font-sans selection:bg-primary/30 text-foreground">
            {/* <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background pointer-events-none" /> */}

            <Navigation />

            <main className={cn("flex-grow fade-in", !isFullWidth ? "container-wide py-8" : "w-full p-0 overflow-x-hidden")}>
                {children}
            </main>

            <Footer />
        </div>
    );
};

export default MainLayout;
