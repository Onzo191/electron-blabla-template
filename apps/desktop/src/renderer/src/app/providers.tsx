import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { system } from "../theme/system";
import { queryClient } from "./queryClient";

export function AppProviders({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ChakraProvider>
  );
}
