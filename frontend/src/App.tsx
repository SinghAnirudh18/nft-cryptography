import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from "./config/wagmi";
import { AuthProvider } from "./context/AuthContext";

import MainLayout from "./components/layout/MainLayout";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import MyNFTs from "./pages/MyNFTs";
import NotFound from "./pages/NotFound";
import { Toaster } from "./components/ui/sonner";

/**
 * Query client
 */
const queryClient = new QueryClient();

/**
 * PageAttributeSetter
 * — sets a data-page attribute on the root <html> element so your
 *   [data-page="..."] CSS selectors will apply automatically.
 */
const PageAttributeSetter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // normalize pathname to a simple token used in your CSS, e.g. "/", "/marketplace" -> "marketplace"
    const token =
      location.pathname === "/" ? "index" : location.pathname.replace(/^\//, "").replace(/\//g, "-") || "index";
    // set on <html> so selectors like [data-page="index"] work in your css
    document.documentElement.setAttribute("data-page", token);
  }, [location]);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <AuthProvider>
            <BrowserRouter>
              <PageAttributeSetter>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/my-nfts" element={<MyNFTs />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </MainLayout>
                <Toaster />
              </PageAttributeSetter>
            </BrowserRouter>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
