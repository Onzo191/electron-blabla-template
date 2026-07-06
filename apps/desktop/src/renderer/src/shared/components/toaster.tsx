import {
  Toaster as ChakraToaster,
  createToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
} from "@chakra-ui/react";

/**
 * Single app-wide toaster instance. Import `toaster` to fire transient
 * notifications (copy success, mutation failures); `<Toaster />` is mounted
 * once in AppProviders so toasts survive route navigation.
 */
export const toaster = createToaster({
  placement: "bottom-end",
  max: 3,
  pauseOnPageIdle: true,
});

export function Toaster(): React.JSX.Element {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => (
          <Toast.Root width={{ md: "sm" }}>
            {toast.type === "loading" ? (
              <Spinner size="sm" color="accent" />
            ) : (
              <Toast.Indicator />
            )}
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title ? <Toast.Title>{toast.title}</Toast.Title> : null}
              {toast.description ? (
                <Toast.Description>{toast.description}</Toast.Description>
              ) : null}
            </Stack>
            {toast.meta?.closable === false ? null : <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
}
