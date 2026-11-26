// SADEX Express Logistics light theme.
// The app was built as a dark UI with Tailwind's white/slate/amber/emerald classes.
// Instead of rewriting hundreds of class names, this remaps those colours to the
// brand palette on a white background: Forest Green #1E5631, white, Soft Gold.
//   white  -> ink (text that used to be white is now dark)
//   black  -> white (dark overlays become light panels)
//   slate  -> inverted green-grey scale
//   emerald-> Forest Green, amber -> Soft Gold, sky -> blue, rose -> red
// Load right after https://cdn.tailwindcss.com and after any page config.
(function () {
  const ink = "#14201A";
  const palette = {
    white: ink,
    black: "#FFFFFF",
    slate: {
      50: "#0F1A14", 100: "#16231B", 200: "#1C2A22", 300: "#2E3E35", 400: "#526158",
      500: "#66756C", 600: "#8A978F", 700: "#C7D1CB", 800: "#E2E9E5", 900: "#EEF3F0", 950: "#FFFFFF"
    },
    emerald: {
      50: "#F2F8F4", 100: "#E1EEE6", 200: "#174427", 300: "#1E5631", 400: "#1E5631",
      500: "#2A7344", 600: "#1E5631", 700: "#174427", 800: "#123620", 900: "#0D2817", 950: "#E8F0EB"
    },
    amber: {
      50: "#FCF7EA", 100: "#F7ECCF", 200: "#6B4F0C", 300: "#7A5A0E", 400: "#8A6A1A",
      500: "#A8842C", 600: "#8A6A1A", 700: "#6E5413", 800: "#5E4309", 900: "#4A3507", 950: "#FBF3DF"
    },
    sky: {
      200: "#0C447C", 300: "#185FA5", 400: "#185FA5", 500: "#378ADD", 600: "#185FA5", 700: "#0C447C", 950: "#E6F1FB"
    },
    rose: {
      200: "#791F1F", 300: "#A32D2D", 400: "#A32D2D", 500: "#D64545", 600: "#A32D2D", 950: "#FCEBEB"
    }
  };
  const brand = { forest: "#1E5631", gold: "#C9A54A", ink, paper: "#F4F7F5" };

  window.tailwind = window.tailwind || {};
  window.tailwind.config = {
    theme: {
      extend: {
        colors: Object.assign({}, palette, {
          brand: Object.assign({ 50: "#FCF7EA", 100: "#F7ECCF", 400: "#A8842C", 500: "#A8842C", 600: "#8A6A1A", emerald: "#1E5631" }, brand),
          ios: { card: "#FFFFFF", elevated: "#FFFFFF", border: "#E2E9E5", subtext: "#526158" }
        }),
        fontFamily: { sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] }
      }
    }
  };
})();
