import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { useRef } from "react";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColorScheme = "red",
}) {
  const cancelRef = useRef();
  
  // Dark mode support
  const dialogBg = useColorModeValue("white", "gray.800");
  const overlayBg = useColorModeValue("blackAlpha.600", "blackAlpha.800");
  const headerColor = useColorModeValue("gray.800", "white");
  const bodyColor = useColorModeValue("gray.600", "gray.200");

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay bg={overlayBg}>
        <AlertDialogContent bg={dialogBg} borderColor={useColorModeValue("gray.200", "gray.600")}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color={headerColor}>
            {title}
          </AlertDialogHeader>

          <AlertDialogBody color={bodyColor}>{message}</AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              {cancelText}
            </Button>
            <Button colorScheme={confirmColorScheme} onClick={onConfirm} ml={3}>
              {confirmText}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
