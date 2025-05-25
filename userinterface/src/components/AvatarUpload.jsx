import { useState, useRef } from "react";
import {
  Box,
  Button,
  Avatar,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  useColorModeValue,
  Input,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { setAvatarImage, clearAvatarImage } from "../store/userSlice";

const AvatarUpload = () => {
  const dispatch = useDispatch();
  const { userName, avatarImage, avatarType } = useSelector((state) => state.user);
  const [uploadError, setUploadError] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const borderColor = useColorModeValue("gray.200", "gray.600");
  const userAvatarBg = useColorModeValue("orange.600", "orange.300");
  const userAvatarText = useColorModeValue("gray.200", "gray.800");

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (PNG, JPG, GIF, etc.)");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image file size must be less than 5MB");
      return;
    }

    setUploadError("");

    // Convert to base64 and create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Image = e.target.result;
      setPreviewImage(base64Image);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = () => {
    if (previewImage) {
      dispatch(setAvatarImage(previewImage));
      setPreviewImage(null);
      
      // Save to localStorage for persistence
      localStorage.setItem("userAvatarImage", previewImage);
    }
  };

  const handleRemoveAvatar = () => {
    dispatch(clearAvatarImage());
    setPreviewImage(null);
    localStorage.removeItem("userAvatarImage");
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelPreview = () => {
    setPreviewImage(null);
    setUploadError("");
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getCurrentAvatarSrc = () => {
    if (previewImage) return previewImage;
    if (avatarType === "custom" && avatarImage) return avatarImage;
    return null;
  };

  return (
    <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
      <VStack spacing={4} align="center">
        <Text fontWeight="bold" fontSize="lg">
          Profile Avatar
        </Text>
        
        <Avatar
          size="xl"
          name={userName}
          src={getCurrentAvatarSrc()}
          bg={userAvatarBg}
          color={userAvatarText}
        />

        <Input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          ref={fileInputRef}
          display="none"
        />

        {uploadError && (
          <Alert status="error" size="sm">
            <AlertIcon />
            {uploadError}
          </Alert>
        )}

        {previewImage ? (
          <HStack spacing={2}>
            <Button
              size="sm"
              colorScheme="green"
              onClick={handleSaveAvatar}
            >
              Save Avatar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelPreview}
            >
              Cancel
            </Button>
          </HStack>
        ) : (
          <VStack spacing={2}>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Custom Avatar
            </Button>
            
            {avatarType === "custom" && avatarImage && (
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={handleRemoveAvatar}
              >
                Remove Custom Avatar
              </Button>
            )}
          </VStack>
        )}

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Recommended: Square image, max 5MB
          <br />
          Supports: PNG, JPG, GIF, WebP
        </Text>
      </VStack>
    </Box>
  );
};

export default AvatarUpload;