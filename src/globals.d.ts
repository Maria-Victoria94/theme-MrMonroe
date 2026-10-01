declare global {
  interface Window {
    Shopify: {
      routes: {
        root: string;
      };
    };
  }
}

export {};
