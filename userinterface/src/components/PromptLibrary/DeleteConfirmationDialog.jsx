import PropTypes from "prop-types";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogHeader,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { useRef } from "react";

export function DeleteConfirmationDialog({ isOpen, onClose, onConfirm }) {
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
    >
      <AlertDialogOverlay bg={overlayBg}>
        <AlertDialogContent bg={dialogBg} borderColor={useColorModeValue("gray.200", "gray.600")}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color={headerColor}>
            Delete Prompt
          </AlertDialogHeader>
          <AlertDialogBody color={bodyColor}>
            Are you sure you want to delete this prompt? This action cannot be
            undone.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onConfirm} ml={3}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}

DeleteConfirmationDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
