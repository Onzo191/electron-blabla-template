import { Button, Dialog, Portal } from "@chakra-ui/react";
import type { UpdateStatus } from "@myvng/shared";

/**
 * No close trigger, no escape/outside dismissal — intentional. This only
 * renders when the running version is below the policy's minimum
 * supported version (or the policy kill-switch is set), so leaving it
 * dismissable would let the user keep running against an incompatible
 * or insecure build. See docs/release-cicd.md Section 6.
 */
export function ForcedUpdateDialog({
  status,
  isBusy,
  onUpdateNow,
}: {
  status: UpdateStatus;
  isBusy: boolean;
  onUpdateNow: () => void;
}): React.JSX.Element {
  const ready = status.state === "downloaded";

  return (
    <Dialog.Root
      open
      closeOnEscape={false}
      closeOnInteractOutside={false}
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Update required</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>
                This version of the app is no longer supported. Update to{" "}
                {status.latestVersion ?? "the latest version"} to keep using it.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Button onClick={onUpdateNow} loading={isBusy}>
                {ready ? "Restart now" : "Update now"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
