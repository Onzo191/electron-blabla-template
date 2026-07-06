import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { Toaster } from "../shared/components/toaster";
import { system } from "../theme/system";
import { queryClient } from "./queryClient";

export function AppProviders({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={domAnimation} strict>
          <MotionConfig reducedMotion="user">
            {children}
            <Toaster />
          </MotionConfig>
        </LazyMotion>
      </QueryClientProvider>
    </ChakraProvider>
  );
}
