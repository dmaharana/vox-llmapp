import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "@fontsource/open-sans";
import "@fontsource/raleway";

import { ChakraProvider, ColorModeScript, extendTheme } from "@chakra-ui/react";

import { Provider } from "react-redux";
import { store } from "./store";

const colors = {
  primaryFontColor: {
    lightMode: "gray.700",
    darkMode: "gray.200",
  },
  secondaryFontColor: {
    lightMode: "gray.600",
    darkMode: "gray.400",
  },
  plainOldBlue: "blue",
};

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({ 
  config,
  colors,
  fonts: {
    heading: `'Open Sans', sans-serif`,
    body: `'Raleway', sans-serif`,
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <App />
      </ChakraProvider>
    </Provider>
  </React.StrictMode>,
);
