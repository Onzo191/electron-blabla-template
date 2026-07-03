import { ChakraProvider } from "@chakra-ui/react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { system } from "../../theme/system";

export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    queryCache: new QueryCache(),
  });

  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </ChakraProvider>,
  );
}
