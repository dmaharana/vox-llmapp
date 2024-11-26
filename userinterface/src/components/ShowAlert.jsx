import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure,
  Box,
  CloseButton,
} from "@chakra-ui/react";

function ShowAlert({ status, title, message, resetStates }) {
  const { isOpen: isVisible, onClose } = useDisclosure({ defaultIsOpen: true });

  const handleClose = () => {
    onClose();
    resetStates();
  };

  return (
    <>
      {isVisible ? (
        <Alert status={status} variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Box>
          <CloseButton
            alignSelf="flex-start"
            position="relative"
            right={-1}
            top={-1}
            onClick={handleClose}
          />
        </Alert>
      ) : null}
    </>
  );
}

export default ShowAlert;
