import Navbar from "@/components/navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <body>
      {/* Layout UI */}
      {/* Place children where you want to render a page or nested layout */}
      <Navbar />
      <main>{children}</main>
    </body>
  );
}
