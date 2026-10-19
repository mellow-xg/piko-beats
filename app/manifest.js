export const dynamic = "force-static";

export default function manifest() {
  return {
    name: "Piko Beats",
    short_name: "Piko Beats",
    description: "Your personal music space.",
    start_url: "/",
    display: "standalone",
    background_color: "#100e16",
    theme_color: "#100e16",
    orientation: "portrait",
    icons: []
  };
}
