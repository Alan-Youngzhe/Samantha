import TabBar from "@/components/TabBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen h-[100dvh]">
      <div className="flex-1 overflow-hidden">{children}</div>
      <TabBar />
    </div>
  );
}
