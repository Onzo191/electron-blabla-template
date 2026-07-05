import { Alert, Button, CloseButton } from "@chakra-ui/react";
import type { UpdateStatus } from "@myvng/shared";

export function UpdateBanner({
  status,
  isBusy,
  onUpdate,
  onDismiss,
}: {
  status: UpdateStatus;
  isBusy: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}): React.JSX.Element {
  const ready = status.state === "downloaded";

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-3">
      <Alert.Root status="info" role="alert" className="max-w-xl shadow-md">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>
            {ready
              ? "Update ready to install"
              : `Update ${status.latestVersion ?? ""} available`}
          </Alert.Title>
          <Alert.Description>
            {ready
              ? "Restart to finish installing the new version."
              : "Download it now, or it installs automatically next time you quit."}
          </Alert.Description>
        </Alert.Content>
        <Button size="sm" onClick={onUpdate} loading={isBusy}>
          {ready ? "Restart now" : "Update"}
        </Button>
        <CloseButton size="sm" onClick={onDismiss} aria-label="Dismiss" />
      </Alert.Root>
    </div>
  );
}
