import { useEffect, useState } from "react";
import {
  Box,
  Input,
  Button,
  HStack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { setUserName } from "../../store/userSlice";

const UserNameEdit = () => {
  const dispatch = useDispatch();
  const { userName } = useSelector((state) => state.user);
  const [tempName, setTempName] = useState(userName);
  const [isEditing, setIsEditing] = useState(false);

  const borderColor = useColorModeValue("gray.200", "gray.600");

  useEffect(() => {
    setTempName(userName);
  }, [userName]);

  const handleSave = () => {
    const trimmedName = tempName.trim();
    if (trimmedName && trimmedName !== userName) {
      dispatch(setUserName(trimmedName));
      // localStorage.setItem("userName", trimmedName);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempName(userName);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
      <Text fontWeight="bold" fontSize="lg" mb={3}>
        Display Name
      </Text>

      {isEditing ? (
        <HStack spacing={2}>
          <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="Enter your name"
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              } else if (e.key === "Escape") {
                handleCancel();
              }
            }}
            autoFocus
          />
          <Button size="sm" colorScheme="green" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </HStack>
      ) : (
        <HStack spacing={2}>
          <Text flex={1} fontSize="md">
            {userName}
          </Text>
          <Button size="sm" colorScheme="blue" onClick={handleEdit}>
            Edit
          </Button>
        </HStack>
      )}
    </Box>
  );
};

export default UserNameEdit;
